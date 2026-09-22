import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2"
import pool from "@/app/utils/db"
import { forgotPasswordSchema } from "@/app/utils/schemas"
import readJson from "@/app/utils/readJson"
import hashToken from "@/app/utils/hashToken"
import sendResetMail from "@/app/utils/mailer"

const TOKEN_LIFETIME_MINUTES = 15
const RESEND_INTERVAL_SECONDS = 60
const APP_URL = process.env.APP_URL ?? "http://localhost:3000"
const SENT_MESSAGE = "パスワード再設定用のメールを送信しました。届かない場合は、そのアドレスが登録されていない可能性があります"

type UserIdRow = RowDataPacket & { id: string }
type TokenIdRow = RowDataPacket & { id: number }

export async function POST(request: Request) {
  try {
    const reqBody = await readJson(request)
    if (reqBody === null) {
      return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 })
    }
    const result = forgotPasswordSchema.safeParse(reqBody)
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 })
    }

    const [users] = await pool.query<UserIdRow[]>(
      "SELECT id FROM users WHERE email = ?",
      [result.data.email]
    )
    if (users.length === 0) {
      return NextResponse.json({ message: SENT_MESSAGE }, { status: 200 })
    }
    const user = users[0]

    const recentAt = new Date(Date.now() - RESEND_INTERVAL_SECONDS * 1000)
    const [recent] = await pool.query<TokenIdRow[]>(
      "SELECT id FROM password_reset_tokens WHERE user_id = ? AND created_at > ? LIMIT 1",
      [user.id, recentAt]
    )
    if (recent.length > 0) {
      return NextResponse.json({ message: SENT_MESSAGE }, { status: 200 })
    }

    const token = crypto.randomUUID()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MINUTES * 60 * 1000)
    await pool.execute(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, expiresAt]
    )

    const resetUrl = `${APP_URL}/user/reset-password/${token}`
    await sendResetMail(result.data.email, resetUrl)
    return NextResponse.json({ message: SENT_MESSAGE }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: "パスワード再設定メールの送信に失敗しました" }, { status: 500 })
  }
}
