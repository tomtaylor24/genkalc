import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import type { PoolConnection } from "mysql2/promise"
import pool from "@/app/utils/db"
import { resetPasswordSchema } from "@/app/utils/schemas"
import readJson from "@/app/utils/readJson"
import hashToken from "@/app/utils/hashToken"

type Props = {
  params: Promise<{ token: string }>
}

type ResetTokenRow = RowDataPacket & {
  user_id: string
  expires_at: Date
}

const INVALID_MESSAGE = "このリンクは無効か、有効期限が切れています"

export async function POST(request: Request, context: Props) {
  let connection: PoolConnection | undefined
  try {
    connection = await pool.getConnection()
    const reqBody = await readJson(request)
    if (reqBody === null) {
      return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 })
    }
    const result = resetPasswordSchema.safeParse(reqBody)
    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 })
    }
    const params = await context.params
    const tokenHash = await hashToken(params.token)

    const [tokens] = await connection.query<ResetTokenRow[]>(
      "SELECT user_id, expires_at FROM password_reset_tokens WHERE token_hash = ?",
      [tokenHash]
    )
    if (tokens.length === 0) {
      return NextResponse.json({ message: INVALID_MESSAGE }, { status: 400 })
    }
    const resetToken = tokens[0]

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ message: INVALID_MESSAGE }, { status: 400 })
    }

    await connection.beginTransaction()
    await connection.execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ?",
      [resetToken.user_id]
    )
    const passwordHash = await bcrypt.hash(result.data.password, 10)
    await connection.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, resetToken.user_id]
    )
    await connection.commit()

    return NextResponse.json({ message: "パスワードを再設定しました" }, { status: 200 })
  } catch (error) {
    try {
      await connection?.rollback()
    } catch (rollbackError) {
      console.error("ロールバックに失敗しました", rollbackError)
    }
    console.log(error)
    return NextResponse.json({ message: "パスワードの再設定に失敗しました" }, { status: 500 })
  } finally {
    connection?.release()
  }
}
