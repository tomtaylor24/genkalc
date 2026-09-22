import { NextResponse } from "next/server"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import type { PoolConnection } from "mysql2/promise"
import pool from "@/app/utils/db"
import verifyToken from "@/app/utils/verifyToken"
import calcDishCost from "@/app/utils/calcCost"
import { dishSchema } from "@/app/utils/schemas"
import readJson from "@/app/utils/readJson"
import type { Dish } from "@/app/types"
import { isDuplicateEntry } from "@/app/utils/dbError"

type IdRow = RowDataPacket & { id: number }

type DishRow = Dish & RowDataPacket

type ItemRow = RowDataPacket & {
  dish_id: number
  quantity: number
  purchase_price: number
  purchase_quantity: number
  yield_rate: number
  tax_add_rate: number
}

type CategoryRow = RowDataPacket & {
  dish_id: number
  id: number
  name: string
}

export async function POST(request: Request) {
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
      const result = dishSchema.safeParse(reqBody)
      if (!result.success) {
        return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 })
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

      const [inserted] = await connection.execute<ResultSetHeader>(
        "INSERT INTO dishes (user_id, name, selling_price, note) VALUES (?, ?, ?, ?)",
        [payload.userId, result.data.name, result.data.sellingPrice, result.data.note]
      )
      const dishId = inserted.insertId

      await connection.query(
        "INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity) VALUES ?",
        [result.data.rows.map((row) => [dishId, row.ingredientId, row.quantity])]
      )

      if (result.data.categoryIds.length > 0) {
        await connection.query(
          "INSERT INTO dish_categories (dish_id, category_id) VALUES ?",
          [result.data.categoryIds.map((categoryId) => [dishId, categoryId])]
        )
      }

      await connection.commit()
      return NextResponse.json({ message: "商品登録成功" }, { status: 201 })
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
      return NextResponse.json({ message: "商品登録に失敗しました" }, { status: 500 })
    } finally {
      connection?.release()
    }
  }
}

export async function GET(request: Request) {
  const payload = await verifyToken(request)

  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const [dishes] = await pool.query<DishRow[]>(
        `SELECT id, user_id, name, selling_price, note, created_at
         FROM dishes
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [payload.userId]
      )
      if (dishes.length === 0) {
        return NextResponse.json({ message: "商品一覧の取得成功", dishes: [] }, { status: 200 })
      }

      const dishIds = dishes.map((dish) => dish.id)

      const [items] = await pool.query<ItemRow[]>(
        `SELECT di.dish_id, di.quantity,
                i.purchase_price, i.purchase_quantity, i.yield_rate, i.tax_add_rate
         FROM dish_ingredients di
         JOIN ingredients i ON i.id = di.ingredient_id
         WHERE di.dish_id IN (?)`,
        [dishIds]
      )

      const [categories] = await pool.query<CategoryRow[]>(
        `SELECT dc.dish_id, c.id, c.name
         FROM dish_categories dc
         JOIN categories c ON c.id = dc.category_id
         WHERE dc.dish_id IN (?)
         ORDER BY c.name`,
        [dishIds]
      )

      const itemsByDish = new Map<number, { quantity: number, ingredients: ItemRow }[]>()
      for (const item of items) {
        const list = itemsByDish.get(item.dish_id) ?? []
        list.push({ quantity: item.quantity, ingredients: item })
        itemsByDish.set(item.dish_id, list)
      }

      const categoriesByDish = new Map<number, { id: number, name: string }[]>()
      for (const category of categories) {
        const list = categoriesByDish.get(category.dish_id) ?? []
        list.push({ id: category.id, name: category.name })
        categoriesByDish.set(category.dish_id, list)
      }

      const dishesWithCost = dishes.map((dish) => ({
        ...dish,
        totalCost: calcDishCost(itemsByDish.get(dish.id) ?? []),
        categories: categoriesByDish.get(dish.id) ?? []
      }))

      return NextResponse.json({
        message: "商品一覧の取得成功",
        dishes: dishesWithCost
      }, { status: 200 })
    } catch (error) {
      console.log(error)
      return NextResponse.json({ message: "商品一覧の取得に失敗しました" }, { status: 500 })
    }
  }
}
