# Data source to get the S3 bucket created by bootstrap
data "aws_s3_bucket" "terraform_state" {
  bucket = "sns-app-terraform-state-${local.bucket_suffix}"
}

# Local to extract bucket suffix from existing buckets
locals {
  # This will be populated after bootstrap creates the bucket
  bucket_suffix = "placeholder"
}

# Move the backend configuration to a separate step after bootstrap