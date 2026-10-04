import Link from "next/link"
import DemoButton from "@/app/components/demoButton"
import styles from "./page.module.scss"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Genkalc | 飲食店向けの原価計算ツール",
  description: "食材の仕入れ値を登録すると、それを使っている商品の原価と原価率を自動で計算します。登録不要のデモをすぐに試せます。",
}

const GITHUB_URL = "https://github.com/tomtaylor24/genkalc"

const HERO_ROWS = [
  { name: "唐揚げ定食", price: 1080, cost: 378, rate: 35, hideSp: false },
  { name: "鯖の味噌煮定食", price: 1180, cost: 340, rate: 29, hideSp: true },
  { name: "カツ丼", price: 1180, cost: 463, rate: 39, hideSp: false },
  { name: "醤油ラーメン", price: 880, cost: 209, rate: 24, hideSp: false },
  { name: "カルボナーラ", price: 1180, cost: 323, rate: 27, hideSp: true },
  { name: "オムライス", price: 1080, cost: 387, rate: 36, hideSp: false },
  { name: "ハイボール", price: 480, cost: 60, rate: 12, hideSp: true },
]

const FLOW_STEPS = [
  {
    title: "食材を登録する",
    text: "食材名と仕入れ値、仕入れ量（g・ml・個など単位つき）を入れて登録します。",
  },
  {
    title: "商品を登録する",
    text: "登録済みの食材から選んで使用量を入力。カテゴリーも選べて、原価はその場で確認できます。",
  },
  {
    title: "商品一覧で見比べる",
    text: "カテゴリーで絞り込むとその範囲の原価率が出ます。売価・原価・原価率で並べ替えもできます。",
  },
]

const INGREDIENT_ROWS = [
  { name: "卵", price: 280, quantity: "10個" },
  { name: "鶏もも肉", price: 880, quantity: "1,000g" },
  { name: "米", price: 2800, quantity: "5,000g" },
]

const SYNC_ROWS = [
  { name: "オムライス", before: 387, after: 399 },
  { name: "親子丼", before: 377, after: 385 },
  { name: "だし巻き卵", before: 94, after: 106 },
]

const CATEGORY_ROWS = [
  { name: "カツ丼", cost: 463, rate: 39 },
  { name: "親子丼", cost: 377, rate: 38 },
]

const SORT_ROWS = [
  { name: "カツ丼", price: 1180, cost: 463, rate: 39 },
  { name: "親子丼", price: 980, cost: 377, rate: 38 },
  { name: "生ビール(中)", price: 580, cost: 221, rate: 38 },
  { name: "オムライス", price: 1080, cost: 387, rate: 36 },
  { name: "ハンバーグ定食", price: 1280, cost: 458, rate: 36 },
]

const yen = (value: number) => `￥${value.toLocaleString()}`

const HeroMock = () => {
  return (
    <div className={styles.heroMock} aria-hidden="true">
      <div className={styles.mockApp}>
        <div className={styles.mockSide}>
          <p className={styles.mockSideTitle}>■Genkalc</p>
          <ul className={styles.mockSideNav}>
            <li className={styles.mockSideActive}>商品一覧</li>
            <li>商品登録</li>
            <li>食材一覧</li>
            <li>食材登録</li>
          </ul>
        </div>
        <div className={styles.mockMain}>
          <div className={styles.mockMainHead}>
            <div>
              <p className={styles.mockMainTitle}>商品一覧</p>
              <p className={styles.mockMainText}>登録済みの商品と原価率を確認できます</p>
            </div>
            <p className={styles.mockMainBtn}>
              <span className="pc">＋ 新しい商品を登録</span>
              <span className="sp">＋ 登録</span>
            </p>
          </div>
          <ul className={styles.mockChips}>
            <li className={styles.mockChipActive}>すべて</li>
            <li>定食</li>
            <li>丼もの</li>
            <li>麺類</li>
            <li className="pc">ドリンク</li>
          </ul>
          <p className={styles.mockSummary}>
            <span className={styles.mockSummaryCount}>18品</span>
            <span className={styles.mockSummaryLabel}>平均原価率</span>
            <span className={styles.mockSummaryRate}>29.9%</span>
          </p>
          <div className={styles.mockTable}>
            <div className={`${styles.mockHead} ${styles.mockHead4}`}>
              <div>料理名</div>
              <div>売価</div>
              <div>原価</div>
              <div>原価率</div>
            </div>
            {HERO_ROWS.map((row) => (
              <div className={`${styles.mockRow} ${styles.mockRow4} ${row.hideSp ? "pc" : ""}`} key={row.name}>
                <div>{row.name}</div>
                <div>{yen(row.price)}</div>
                <div>{yen(row.cost)}</div>
                <div className={row.rate >= 30 ? styles.mockHigh : undefined}>{row.rate}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SyncMock = () => {
  return (
    <div className={styles.mock} aria-hidden="true">
      <div className={styles.mockTable}>
        <div className={`${styles.mockHead} ${styles.mockHead3}`}>
          <div>食材名</div>
          <div>仕入れ値</div>
          <div>仕入れ量</div>
        </div>
        {INGREDIENT_ROWS.map((row) => (
          <div className={`${styles.mockRow} ${styles.mockRow3}`} key={row.name}>
            <div>{row.name}</div>
            <div>{yen(row.price)}</div>
            <div>{row.quantity}</div>
          </div>
        ))}
      </div>
      <p className={styles.mockNote}>卵を ￥280 → ￥320 に更新すると</p>
      <div className={styles.mockTable}>
        {SYNC_ROWS.map((row) => (
          <div className={`${styles.mockRow} ${styles.mockRow2}`} key={row.name}>
            <div>{row.name}</div>
            <div>
              <span className={styles.mockBefore}>{yen(row.before)}</span>
              <span className={styles.mockArrow}>→</span>
              <span className={styles.mockAfter}>{yen(row.after)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CategoryMock = () => {
  return (
    <div className={styles.mock} aria-hidden="true">
      <ul className={styles.mockChips}>
        <li className={styles.mockChipActive}>丼もの</li>
        <li>定食</li>
        <li>ドリンク</li>
      </ul>
      <p className={styles.mockSummary}>
        <span className={styles.mockSummaryCount}>丼もの 2品</span>
        <span className={styles.mockSummaryLabel}>平均原価率</span>
        <span className={styles.mockSummaryRate}>38.9%</span>
      </p>
      <div className={styles.mockTable}>
        <div className={`${styles.mockHead} ${styles.mockHead3}`}>
          <div>料理名</div>
          <div>原価</div>
          <div>原価率</div>
        </div>
        {CATEGORY_ROWS.map((row) => (
          <div className={`${styles.mockRow} ${styles.mockRow3}`} key={row.name}>
            <div>{row.name}</div>
            <div>{yen(row.cost)}</div>
            <div className={row.rate >= 30 ? styles.mockHigh : undefined}>{row.rate}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SortMock = () => {
  return (
    <div className={styles.mock} aria-hidden="true">
      <p className={styles.mockSort}>
        <span className={styles.mockSortLabel}>並べ替え</span>
        <span className={styles.mockSortSelect}>原価率が高い順</span>
      </p>
      <div className={styles.mockTable}>
        <div className={`${styles.mockHead} ${styles.mockHead4}`}>
          <div>料理名</div>
          <div>売価</div>
          <div>原価</div>
          <div>原価率</div>
        </div>
        {SORT_ROWS.map((row) => (
          <div className={`${styles.mockRow} ${styles.mockRow4}`} key={row.name}>
            <div>{row.name}</div>
            <div>{yen(row.price)}</div>
            <div>{yen(row.cost)}</div>
            <div className={row.rate >= 30 ? styles.mockHigh : undefined}>{row.rate}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const Landing = () => {
  return (
    <div className={styles.lp}>
      <header className={styles.header}>
        <div className={`${styles.inner} ${styles.headerInner}`}>
          <p className={styles.logo}>
            <span className={styles.logoName}>Genkalc</span>
            <span className={`${styles.logoRead} pc`}>ゲンカルク</span>
          </p>
          <nav className={styles.nav} aria-label="サイト内リンク">
            <ul className={styles.navList}>
              <li className="pc"><a href="#flowTitle" className={styles.navLink}>使い方の流れ</a></li>
              <li className="pc"><a href="#featuresTitle" className={styles.navLink}>できること</a></li>
              <li><Link href="/user/login" className={styles.navLink}>ログイン</Link></li>
            </ul>
            <Link href="/user/register" className={styles.navRegister}>会員登録</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`${styles.inner} ${styles.heroInner}`}>
            <div className={styles.heroBody}>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroTitleLine}>メニューの原価と原価率を</span>
                <span className={styles.heroTitleLine}>仕入れ値から自動で。</span>
              </h1>
              <p className={styles.heroText}>食材の仕入れ値と仕入れ量を登録しておけば、あとは使う分量を入れるだけ。原価と原価率は、開くたびに最新の値で計算されます。</p>
              <div className={styles.heroActions}>
                <DemoButton className={styles.heroPrimary} />
                <Link href="/user/register" className={styles.heroSecondary}>会員登録</Link>
              </div>
              <p className={styles.heroNote}>登録不要でデモを試せます。データは24時間で自動削除されます。</p>
            </div>
            <HeroMock />
          </div>
        </section>

        <section className={styles.flow} aria-labelledby="flowTitle">
          <div className={styles.inner}>
            <h2 className={styles.sectionTitle} id="flowTitle">使い方の流れ</h2>
            <ol className={styles.flowList}>
              {FLOW_STEPS.map((step, index) => (
                <li className={styles.flowItem} key={step.title}>
                  <p className={styles.flowNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className={styles.flowTitle}>{step.title}</h3>
                  <p className={styles.flowText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="featuresTitle">
          <div className={styles.inner}>
            <h2 className={styles.sectionTitle} id="featuresTitle">できること</h2>
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureBody}>
                  <div className={styles.featureHead}>
                    <p className={styles.featureNumber} aria-hidden="true">01</p>
                    <h3 className={styles.featureTitle}>仕入れ値を変えれば、原価がまとめて動く</h3>
                  </div>
                  <p className={styles.featureText}>卵の仕入れ値を1か所更新すれば、卵を使うすべての商品の原価と原価率が同時に変わります。原価は保存せず、表示するたびに計算しているからです。</p>
                </div>
                <SyncMock />
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureBody}>
                  <div className={styles.featureHead}>
                    <p className={styles.featureNumber} aria-hidden="true">02</p>
                    <h3 className={styles.featureTitle}>カテゴリーごとの原価率がわかる</h3>
                  </div>
                  <p className={styles.featureText}>定食・丼もの・ドリンクなど、カテゴリーは自由に作って商品に付けられます。絞り込むとその分類だけの平均原価率が出ます。</p>
                </div>
                <CategoryMock />
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureBody}>
                  <div className={styles.featureHead}>
                    <p className={styles.featureNumber} aria-hidden="true">03</p>
                    <h3 className={styles.featureTitle}>原価率の高い商品から並べ替えられる</h3>
                  </div>
                  <p className={styles.featureText}>売価・原価・原価率で並べ替え。原価率30%超は赤で表示されるので、手を入れるべき商品が上から順に並びます。</p>
                </div>
                <SortMock />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.inner}>
            <div className={styles.ctaBox}>
              <div className={styles.ctaBody}>
                <p className={styles.ctaTitle}>まずはデモで触ってみてください</p>
                <p className={styles.ctaText}>商品18件・食材40件が入った状態で試せます。登録不要、データは24時間で自動削除されます。</p>
              </div>
              <DemoButton className={styles.ctaBtn} />
            </div>
          </div>
        </section>

      </main>

      <footer className={styles.footer}>
        <div className={`${styles.inner} ${styles.footerInner}`}>
          <p className={styles.footerText}>© 2026 Genkalc</p>
          <a className={styles.footerLink} href={GITHUB_URL} target="_blank" rel="noreferrer">GitHubでコードを見る</a>
        </div>
      </footer>
    </div>
  )
}

export default Landing
