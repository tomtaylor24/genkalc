import { NextResponse } from "next/server"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import type { PoolConnection } from "mysql2/promise"
import pool from "@/app/utils/db"
import verifyToken from "@/app/utils/verifyToken"
import { dishSchema } from "@/app/utils/schemas"
import readJson from "@/app/utils/readJson"
import type { Dish } from "@/app/types"
import { isDuplicateEntry } from "@/app/utils/dbError"

type Context = {
  params: Promise<{ id: string }>
}

type IdRow = RowDataPacket & { id: number }

type DishRow = Dish & RowDataPacket

type DetailItemRow = RowDataPacket & {
  id: number
  ingredient_id: number
  quantity: number
  name: string
  unit: string
  purchase_price: number
  purchase_quantity: number
  yield_rate: number
  tax_add_rate: number
}

type CategoryIdRow = RowDataPacket & { category_id: number }

export async function GET(request: Request, context: Context) {
  const payload = await verifyToken(request)

  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const params = await context.params
      const [dishes] = await pool.query<DishRow[]>(
        `SELECT id, user_id, name, selling_price, note, created_at
         FROM dishes
         WHERE id = ? AND user_id = ?`,
        [params.id, payload.userId]
      )
      if (dishes.length === 0) {
        return NextResponse.json({ message: "商品が見つかりません" }, { status: 404 })
      }

      const [items] = await pool.query<DetailItemRow[]>(
        `SELECT di.id, di.ingredient_id, di.quantity,
                i.name, i.unit, i.purchase_price, i.purchase_quantity, i.yield_rate, i.tax_add_rate
         FROM dish_ingredients di
         JOIN ingredients i ON i.id = di.ingredient_id
         WHERE di.dish_id = ?`,
        [params.id]
      )

      const [categories] = await pool.query<CategoryIdRow[]>(
        "SELECT category_id FROM dish_categories WHERE dish_id = ?",
        [params.id]
      )

      return NextResponse.json({
        message: "商品詳細取得成功",
        dish: {
          ...dishes[0],
          dish_categories: categories,
          dish_ingredients: items.map((item) => ({
            id: item.id,
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            ingredients: {
              name: item.name,
              unit: item.unit,
              purchase_price: item.purchase_price,
              purchase_quantity: item.purchase_quantity,
              yield_rate: item.yield_rate,
              tax_add_rate: item.tax_add_rate
            }
          }))
        }
      }, { status: 200 })
    } catch (error) {
      console.log(error)
      return NextResponse.json({ message: "商品の取得に失敗しました" }, { status: 500 })
    }
  }
}

export async function PUT(request: Request, context: Context) {
  const payload = await verifyToken(request)

  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    let connection: PoolConnection | undefined
    try {
      connection = await pool.getConnection()
      const reqBody = await readJson(request)
      if (reqBody === null) {
        return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 })
      }
      const params = await context.params
      const result = dishSchema.safeParse(reqBody)
      if (!result.success) {
        return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 })
      }

      const [target] = await connection.query<IdRow[]>(
        "SELECT id FROM dishes WHERE id = ? AND user_id = ?",
        [params.id, payload.userId]
      )
      if (target.length === 0) {
        return NextResponse.json({ message: "商品が見つかりません" }, { status: 404 })
      }

      const ingredientIds = result.data.rows.map((row) => row.ingredientId)
      const [foundIngredients] = await connection.query<IdRow[]>(
        "SELECT id FROM ingredients WHERE id IN (?) AND user_id = ?",
        [ingredientIds, payload.userId]
      )
      if (foundIngredients.length !== new Set(ingredientIds).size) {
        return NextResponse.json({ message: "食材が見つかりません" }, { status: 400 })
      }

      if (result.data.categoryIds.length > 0) {
        const [foundCategories] = await connection.query<IdRow[]>(
          "SELECT id FROM categories WHERE id IN (?) AND user_id = ?",
          [result.data.categoryIds, payload.userId]
        )
        if (foundCategories.length !== new Set(result.data.categoryIds).size) {
          return NextResponse.json({ message: "カテゴリーが見つかりません" }, { status: 400 })
        }
      }

      await connection.beginTransaction()

      await connection.execute(
        "UPDATE dishes SET name = ?, selling_price = ?, note = ? WHERE id = ? AND user_id = ?",
        [result.data.name, result.data.sellingPrice, result.data.note, params.id, payload.userId]
      )

      await connection.execute("DELETE FROM dish_ingredients WHERE dish_id = ?", [params.id])
      await connection.query(
        "INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity) VALUES ?",
        [result.data.rows.map((row) => [params.id, row.ingredientId, row.quantity])]
      )

      await connection.execute("DELETE FROM dish_categories WHERE dish_id = ?", [params.id])
      if (result.data.categoryIds.length > 0) {
        await connection.query(
          "INSERT INTO dish_categories (dish_id, category_id) VALUES ?",
          [result.data.categoryIds.map((categoryId) => [params.id, categoryId])]
        )
      }

      await connection.commit()
      return NextResponse.json({ message: "商品編集成功" }, { status: 200 })
    } catch (error) {
      try {
        await connection?.rollback()
      } catch (rollbackError) {
        console.error("ロールバックに失敗しました", rollbackError)
      }
      if (isDuplicateEntry(error, "dish_ingredients")) {
        return NextResponse.json({ message: "同じ食材が複数の行で選ばれています" }, { status: 400 })
      }
      if (isDuplicateEntry(error, "dish_categories")) {
        return NextResponse.json({ message: "同じカテゴリーが重複して選ばれています" }, { status: 400 })
      }
      if (isDuplicateEntry(error)) {
        return NextResponse.json({ message: "同じ名前の商品が既に登録されています" }, { status: 400 })
      }
      console.log(error)
      return NextResponse.json({ message: "商品編集に失敗しました" }, { status: 500 })
    } finally {
      connection?.release()
    }
  }
}

export async function DELETE(request: Request, context: Context) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const params = await context.params
      const [result] = await pool.execute<ResultSetHeader>(
        "DELETE FROM dishes WHERE id = ? AND user_id = ?",
        [params.id, payload.userId]
      )
      if (result.affectedRows === 0) {
        return NextResponse.json({ message: "商品が見つかりません" }, { status: 404 })
      }
      return NextResponse.json({ message: "商品削除成功" }, { status: 200 })
    } catch (error) {
      console.log(error)
      return NextResponse.json({ message: "商品削除失敗" }, { status: 500 })
    }
  }
}
