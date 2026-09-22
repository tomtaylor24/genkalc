import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/app/utils/db";
import { userSchema } from "@/app/utils/schemas";
import { issueToken } from "@/app/utils/jwt";
import readJson from "@/app/utils/readJson";
import { isDuplicateEntry } from "@/app/utils/dbError";

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
    const hashedPassword = await bcrypt.hash(result.data.password, 10)
    const userId = crypto.randomUUID()
    await pool.execute(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      [userId, result.data.email, hashedPassword]
    )
    const token = await issueToken(userId, result.data.email)
    return NextResponse.json({ message: "ユーザー登録成功", token: token }, { status: 201 })
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return NextResponse.json({ message: "このメールアドレスはすでに登録されています" }, { status: 400 })
    }
    console.log(error)
    return NextResponse.json({ message: "ユーザー登録に失敗しました" }, { status: 500 })
  }
}
