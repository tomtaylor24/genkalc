import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import type { PoolConnection } from "mysql2/promise"
import pool from "@/app/utils/db"
import { issueToken } from "@/app/utils/jwt"
import { DEMO_CATEGORIES, DEMO_INGREDIENTS, DEMO_DISHES } from "@/app/utils/demoData"

const DEMO_LIFETIME_HOURS = 24

type NamedRow = RowDataPacket & {
  id: number
  name: string
}

type DemoIngredientRow = NamedRow & {
  purchase_price: number
  purchase_quantity: number
  yield_rate: number
  tax_add_rate: number
  created_at: Date
}

const toIdByName = (rows: NamedRow[]) => {
  const idByName: Record<string, number> = {}
  for (const row of rows) {
    idByName[row.name] = row.id
  }
  return idByName
}

export async function POST() {
  try {
    const expiredAt = new Date(Date.now() - DEMO_LIFETIME_HOURS * 60 * 60 * 1000)
    await pool.execute(
      "DELETE FROM users WHERE is_demo = TRUE AND created_at < ?",
      [expiredAt]
    )
  } catch (cleanupError) {
    console.log(cleanupError)
  }

  let connection: PoolConnection | undefined
  try {
    connection = await pool.getConnection()
    const userId = crypto.randomUUID()
    const email = `demo-${crypto.randomUUID()}@example.invalid`
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10)

    await connection.beginTransaction()

    await connection.execute(
      "INSERT INTO users (id, email, password_hash, is_demo) VALUES (?, ?, ?, TRUE)",
      [userId, email, passwordHash]
    )

    await connection.query(
      "INSERT INTO categories (user_id, name) VALUES ?",
      [DEMO_CATEGORIES.map((name) => [userId, name])]
    )
    const [categoryRows] = await connection.query<NamedRow[]>(
      "SELECT id, name FROM categories WHERE user_id = ?",
      [userId]
    )
    const categoryIdByName = toIdByName(categoryRows)

    await connection.query(
      "INSERT INTO ingredients (user_id, name, name_kana, purchase_price, purchase_quantity, unit) VALUES ?",
      [DEMO_INGREDIENTS.map((ingredient) => [
        userId,
        ingredient.name,
        ingredient.name_kana,
        ingredient.purchase_price,
        ingredient.purchase_quantity,
        ingredient.unit
      ])]
    )
    const [ingredientRows] = await connection.query<DemoIngredientRow[]>(
      `SELECT id, name, purchase_price, purchase_quantity, yield_rate, tax_add_rate, created_at
       FROM ingredients WHERE user_id = ?`,
      [userId]
    )
    const ingredientIdByName = toIdByName(ingredientRows)

    await connection.query(
      `INSERT INTO ingredient_price_history
         (ingredient_id, purchase_price, purchase_quantity, yield_rate, tax_add_rate, changed_at)
       VALUES ?`,
      [ingredientRows.map((ingredient) => [
        ingredient.id,
        ingredient.purchase_price,
        ingredient.purchase_quantity,
        ingredient.yield_rate,
        ingredient.tax_add_rate,
        ingredient.created_at
      ])]
    )

    await connection.query(
      "INSERT INTO dishes (user_id, name, selling_price) VALUES ?",
      [DEMO_DISHES.map((dish) => [userId, dish.name, dish.selling_price])]
    )
    const [dishRows] = await connection.query<NamedRow[]>(
      "SELECT id, name FROM dishes WHERE user_id = ?",
      [userId]
    )
    const dishIdByName = toIdByName(dishRows)

    await connection.query(
      "INSERT INTO dish_categories (dish_id, category_id) VALUES ?",
      [DEMO_DISHES.flatMap((dish) => dish.categories.map((name) => [
        dishIdByName[dish.name],
        categoryIdByName[name]
      ]))]
    )

    await connection.query(
      "INSERT INTO dish_ingredients (dish_id, ingredient_id, quantity) VALUES ?",
      [DEMO_DISHES.flatMap((dish) => dish.items.map((item) => [
        dishIdByName[dish.name],
        ingredientIdByName[item.ingredient],
        item.quantity
      ]))]
    )

    await connection.commit()

    const token = await issueToken(userId, email)
    return NextResponse.json({ message: "デモアカウントを準備しました", token: token }, { status: 201 })
  } catch (error) {
    try {
      await connection?.rollback()
    } catch (rollbackError) {
      console.error("ロールバックに失敗しました", rollbackError)
    }
    console.log(error)
    return NextResponse.json({ message: "デモの準備に失敗しました" }, { status: 500 })
  } finally {
    connection?.release()
  }
}
