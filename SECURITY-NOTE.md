# セキュリティに関する注意事項

## Firebase APIキー
`firebase-config.js` にAPIキーがハードコードされています。
Firebase APIキーはクライアントサイドで使用されることが前提のため、
キー自体の漏洩は直接的なセキュリティリスクではありませんが、
以下のFirestoreセキュリティルールが適切に設定されていることを確認してください:

### 推奨Firestoreルール
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 認証済みユーザーのみ自分のデータにアクセス可能
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // その他のドキュメントはアクセス不可
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 確認すべき項目
1. Firebase Console → Firestore → ルール で上記と同等のルールが設定されていること
2. Firebase Console → Authentication で匿名認証のみが有効であること
3. Firebase Console → プロジェクトの設定 → APIキーの制限 でHTTPリファラー制限が設定されていること

### .gitignore について
`firebase-config.js` が `.gitignore` に含まれていない場合、APIキーがリポジトリに公開されます。
公開リポジトリの場合は `.gitignore` に `firebase-config.js` を追加することを検討してください。
