import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/utils/db";
import { userSchema } from "@/app/utils/schemas";
import { issueToken } from "@/app/utils/jwt";
import readJson from "@/app/utils/readJson";

type UserRow = RowDataPacket & {
  id: string
  password_hash: string
}

const FAILED_MESSAGE = "ログイン失敗：メールアドレスまたはパスワードが違います"

export async function POST(request: Request) {
  try {
    const reqBody = await readJson(request)
    if (reqBody === null) {
      return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 })
    }
    const result = userSchema.safeParse(reqBody)
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 })
    }
    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, password_hash FROM users WHERE email = ?",
      [result.data.email]
    )
    if (rows.length === 0) {
      return NextResponse.json({ message: FAILED_MESSAGE }, { status: 401 })
    }
    const user = rows[0]
    if (!await bcrypt.compare(result.data.password, user.password_hash)) {
      return NextResponse.json({ message: FAILED_MESSAGE }, { status: 401 })
    }
    const token = await issueToken(user.id, result.data.email)
    return NextResponse.json({ message: "ログイン成功", token: token })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: "ログイン失敗" }, { status: 500 })
  }
}
