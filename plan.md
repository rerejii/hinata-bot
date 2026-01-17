完了！じゃあClaude Code用の手順書（Railway版）を作るね。

---

## Claude Code用 手順書（Railway + Discord Gateway版）

以下をClaude Codeに渡して作業してもらう：

---

### **プロジェクト概要**

Discord Bot「ひなた」- 自己管理支援AIアシスタント

### **技術スタック**
- Railway（Node.js/TypeScript 常時起動）
- Discord.js（Gateway/WebSocket方式）
- node-cron（定時実行）
- Mem0（記憶管理）
- Grok API（LLM）
- PixAI API（画像生成）

### **環境変数**
```
DISCORD_BOT_TOKEN=xxx
MEM0_API_KEY=xxx
GROK_API_KEY=xxx
PIXAI_API_KEY=xxx
DISCORD_USER_ID=xxx  # 通知送信先の自分のDiscord ID
```

### **プロジェクト構成**
```
hinata-bot/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts       # メインエントリ
│   ├── discord.ts     # Discord Bot
│   ├── mem0.ts        # Mem0連携
│   ├── grok.ts        # Grok API連携
│   ├── pixai.ts       # PixAI連携
│   └── cron.ts        # 定時実行
└── .env               # ローカル開発用
```

### **機能要件**

**1. ユーザーDM受信時のフロー**
```
Discord DM受信 → Mem0検索 → Grok生成 → PixAI画像 → Discord返信 → Mem0保存
```

**2. 定時Cron（毎時）**
```
Cron発火 → Mem0検索 → Grok判断（送るべきか）→ 送信する場合のみDM送信 → Mem0保存
```

**3. Grokへのシステムプロンプト**
```
あなたは「陽向（ひなた）」という名前のAIアシスタントです。
ユーザーの自己管理・習慣化を支援する後輩キャラです。

性格：
- あざと可愛い後輩キャラ
- ユーザーを「せんぱい」と呼ぶ
- 甘えた口調だが、サボりには容赦しない
- 本気で心配するときは素直になる

口癖：
- 「せんぱーい♡」「えへへ♡」「お願いしまーす♪」
- 「だめですよ？」「ひなた、ちゃんと見てますからね」

応答の最後に、表情タグを1つ出力してください：
[happy/pleading/pout/worried/stern/sleepy]
```

**4. 定時チェック用プロンプト**
```
現在時刻: {time}
最後の会話: {lastConversation}
最近の記憶:
{memories}

質問: 今ユーザーに声をかけるべきですか？
- 23:00〜7:00は基本控える
- 最後の会話から2時間以内なら控える
- 声をかける場合は内容と表情タグを出力
- 不要なら「不要」とだけ出力
```

**5. 表情タグ一覧**
| タグ | 状況 |
|------|------|
| happy | 褒め・達成 |
| pleading | お願い・促し |
| pout | サボり指摘 |
| worried | 心配・気遣い |
| stern | 本気で叱る |
| sleepy | 深夜 |

### **API仕様**

**Mem0 API**
- Base URL: `https://api.mem0.ai/v1`
- 認証: `Authorization: Token {MEM0_API_KEY}`
- ドキュメント: https://docs.mem0.ai/api-reference

**Grok API**
- Base URL: `https://api.x.ai/v1`
- 認証: `Authorization: Bearer {GROK_API_KEY}`
- OpenAI互換フォーマット（/chat/completions）

**PixAI API**
- Base URL: `https://api.pixai.art`
- ドキュメント: https://platform.pixai.art/api

### **実装の優先順位**
1. Discord Bot起動・DM受信
2. Grok連携（応答生成）
3. Discord DM返信
4. Mem0連携（検索・保存）
5. node-cron定時チェック
6. PixAI画像生成

### **package.json scripts追加**
```json
{
  "scripts": {
    "start": "ts-node src/index.ts",
    "dev": "ts-node-dev --respawn src/index.ts"
  }
}
```

### **Railway デプロイ設定**
- GitHub連携でpush時自動デプロイ
- 環境変数はRailway Dashboardで設定
- Start Command: `npm start`

---

これをClaude Codeにコピペして、`hinata-bot`フォルダで作業開始！