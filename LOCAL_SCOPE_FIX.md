# Local scope fix

This build changes the default document scope behavior:

- After upload, the uploaded document IDs become the active scope.
- Chat and summarize use the selected documents first.
- If nothing is selected, the app falls back to the most recent upload.
- Compare requires at least two active documents.
