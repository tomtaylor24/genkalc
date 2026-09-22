import { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/utils/db";
import verifyToken from "@/app/utils/verifyToken";
import { ingredientSchema } from "@/app/utils/schemas";
import readJson from "@/app/utils/readJson";
import type { Ingredient } from "@/app/types";
import { isDuplicateEntry } from "@/app/utils/dbError";

type IngredientRow = Ingredient & RowDataPacket

export async function POST(request: Request) {
  const payload = await verifyToken(request)

  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const reqBody = await readJson(request)
      if (reqBody === null) {
        return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 })
      }
      const result = ingredientSchema.safeParse(reqBody)
      if (!result.success) {
        return NextResponse.json(
          { message: result.error.issues[0].message },
          { status: 400 }
        )
      }
      const [inserted] = await pool.execute<ResultSetHeader>(
        `INSERT INTO ingredients
           (user_id, name, name_kana, purchase_price, purchase_quantity, unit, yield_rate, tax_add_rate, supplier, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.userId,
          result.data.name,
          result.data.nameKana,
          result.data.purchasePrice,
          result.data.purchaseQuantity,
          result.data.unit,
          result.data.yieldRate,
          result.data.taxAddRate,
          result.data.supplier,
          result.data.note
        ]
      )

      try {
        await pool.execute(
          `INSERT INTO ingredient_price_history
             (ingredient_id, purchase_price, purchase_quantity, yield_rate, tax_add_rate)
           VALUES (?, ?, ?, ?, ?)`,
          [
            inserted.insertId,
            result.data.purchasePrice,
            result.data.purchaseQuantity,
            result.data.yieldRate,
            result.data.taxAddRate
          ]
        )
      } catch (historyError) {
        console.log(historyError)
      }

      return NextResponse.json({ message: "食材登録成功" }, { status: 201 })
    } catch (error) {
      if (isDuplicateEntry(error)) {
        return NextResponse.json({ message: "同じ名前の食材が既に登録されています" }, { status: 400 })
      }
      console.log(error)
      return NextResponse.json({ message: "食材登録に失敗しました" }, { status: 500 })
    }
  }
}


export async function GET(request: Request) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const [rows] = await pool.query<IngredientRow[]>(
        `SELECT id, user_id, name, name_kana, purchase_price, purchase_quantity,
                unit, yield_rate, tax_add_rate, supplier, note, created_at
         FROM ingredients
         WHERE user_id = ?
         ORDER BY (name_kana IS NULL), name_kana, name`,
        [payload.userId]
      )
      return NextResponse.json({
        message: "食材一覧の取得成功",
        ingredients: rows
      },
        { status: 200 }
      )
    } catch (error) {
      console.log(error)
      return NextResponse.json({ message: "食材一覧の取得失敗" }, { status: 500 })
    }
  }
}
