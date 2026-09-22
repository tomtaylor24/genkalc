import verifyToken from "@/app/utils/verifyToken";
import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import pool from "@/app/utils/db";

type Context = {
  params: Promise<{id: string}>
}

export async function DELETE(request: Request, context: Context) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ message: "トークンが有効ではありません" }, { status: 401 })
  } else {
    try {
      const params = await context.params
      const [result] = await pool.execute<ResultSetHeader>(
        "DELETE FROM categories WHERE id = ? AND user_id = ?",
        [params.id, payload.userId]
      )
      if (result.affectedRows === 0) {
        return NextResponse.json({ message: "カテゴリーが見つかりません" }, { status: 404 })
      }
      return NextResponse.json({ message: "カテゴリー削除成功" }, { status: 200 })
    } catch (error) {
      console.log(error)
      return NextResponse.json({ message: "カテゴリー削除失敗"}, { status: 500 })
    }
  }
}
