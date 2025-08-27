# Terraformリモートバックエンド用リソース
# 権限問題を回避するため、既存リソースをdataソースで参照

# 既存のS3バケットを参照（作成後）
data "aws_s3_bucket" "terraform_state" {
  bucket = "social-app-terraform-state-bucket-apne1"
}

# 既存のDynamoDBテーブルを参照（作成後）
data "aws_dynamodb_table" "terraform_locks" {
  name = "social-app-terraform-locks"
}