import verifyToken from "@/app/utils/verifyToken";
import { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/utils/db";
import { ingredientSchema } from "@/app/utils/schemas";
import readJson from "@/app/utils/readJson";
import type { Ingredient, PriceHistoryRow, UsedDish } from "@/app/types";
import { isDuplicateEntry, isStillReferenced } from "@/app/utils/dbError";

type Context = {
  params: Promise<{ id: string }>
}

type IngredientRow = Ingredient & RowDataPacket

type UsedDishRow = UsedDish & RowDataPacket

type PriceSnapshotRow = RowDataPacket & {
  purchase_price: number
  purchase_quantity: number
  yield_rate: number
  tax_add_rate: number
}

type HistoryRow = PriceHistoryRow & RowDataPacket

export async function GET(request: Request, context: Context) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const params = await context.params
      const [rows] = await pool.query<IngredientRow[]>(
        `SELECT id, user_id, name, name_kana, purchase_price, purchase_quantity,
                unit, yield_rate, tax_add_rate, supplier, note, created_at
         FROM ingredients
         WHERE id = ? AND user_id = ?`,
        [params.id, payload.userId]
      )
      if (rows.length === 0) {
        return NextResponse.json({ message: "食材が見つかりません" }, { status: 404 })
      }
      const ingredient = rows[0]

      const [usedDishes] = await pool.query<UsedDishRow[]>(
        `SELECT d.id, d.name, di.quantity
         FROM dish_ingredients di
         JOIN dishes d ON d.id = di.dish_id
         WHERE di.ingredient_id = ? AND d.user_id = ?
         ORDER BY d.name`,
        [params.id, payload.userId]
      )

      const [history] = await pool.query<HistoryRow[]>(
        `SELECT id, purchase_price, purchase_quantity, yield_rate, tax_add_rate, changed_at
         FROM ingredient_price_history
         WHERE ingredient_id = ?
         ORDER BY changed_at DESC
         LIMIT 10`,
        [params.id]
      )

      return NextResponse.json({
        message: "食材詳細取得成功",
        ingredient: {
          ...ingredient,
          used_dishes: usedDishes,
          ingredient_price_history: history
        }
      }, { status: 200 })
    } catch (error) {
      console.log(error)
      return NextResponse.json({ message: "食材の取得に失敗しました" }, { status: 500 })
    }
  }
}

export async function PUT(request: Request, context: Context) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const reqBody = await readJson(request)
      if (reqBody === null) {
        return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 })
      }
      const params = await context.params
      const result = ingredientSchema.safeParse(reqBody)
      if (!result.success) {
        return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 })
      }

      const [oldRows] = await pool.query<PriceSnapshotRow[]>(
        `SELECT purchase_price, purchase_quantity, yield_rate, tax_add_rate
         FROM ingredients
         WHERE id = ? AND user_id = ?`,
        [params.id, payload.userId]
      )
      if (oldRows.length === 0) {
        return NextResponse.json({ message: "食材が見つかりません" }, { status: 404 })
      }
      const previous = oldRows[0]

      await pool.execute<ResultSetHeader>(
        `UPDATE ingredients
         SET name = ?, name_kana = ?, purchase_price = ?, purchase_quantity = ?,
             unit = ?, yield_rate = ?, tax_add_rate = ?, supplier = ?, note = ?
         WHERE id = ? AND user_id = ?`,
        [
          result.data.name,
          result.data.nameKana,
          result.data.purchasePrice,
          result.data.purchaseQuantity,
          result.data.unit,
          result.data.yieldRate,
          result.data.taxAddRate,
          result.data.supplier,
          result.data.note,
          params.id,
          payload.userId
        ]
      )

      const isPriceChanged =
        previous.purchase_price !== result.data.purchasePrice ||
        previous.purchase_quantity !== result.data.purchaseQuantity ||
        previous.yield_rate !== result.data.yieldRate ||
        previous.tax_add_rate !== result.data.taxAddRate

      if (isPriceChanged) {
        try {
          await pool.execute(
            `INSERT INTO ingredient_price_history
               (ingredient_id, purchase_price, purchase_quantity, yield_rate, tax_add_rate)
             VALUES (?, ?, ?, ?, ?)`,
            [
              params.id,
              result.data.purchasePrice,
              result.data.purchaseQuantity,
              result.data.yieldRate,
              result.data.taxAddRate
            ]
          )
        } catch (historyError) {
          console.log(historyError)
        }
      }

      return NextResponse.json({ message: "食材編集成功" }, { status: 200 })
    } catch (error) {
      if (isDuplicateEntry(error)) {
        return NextResponse.json({ message: "同じ名前の食材が既に登録されています" }, { status: 400 })
      }
      console.log(error)
      return NextResponse.json({ message: "食材編集に失敗しました" }, { status: 500 })
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
        "DELETE FROM ingredients WHERE id = ? AND user_id = ?",
        [params.id, payload.userId]
      )
      if (result.affectedRows === 0) {
        return NextResponse.json({ message: "食材が見つかりません" }, { status: 404 })
      }
      return NextResponse.json({ message: "食材削除成功" }, { status: 200 })
    } catch (error) {
      if (isStillReferenced(error)) {
        return NextResponse.json({ message: "この食材は商品で使われているため削除できません" }, { status: 400 })
      }
      console.log(error)
      return NextResponse.json({ message: "食材の削除に失敗しました" }, { status: 500 })
    }
  }
}
