# SSM Parameters for sensitive data
resource "aws_ssm_parameter" "app_key" {
  name      = "/${var.project_name}/app_key"
  type      = "SecureString"
  value     = var.app_key
  overwrite = true

  tags = {
    Name = "${var.project_name}-app-key"
  }
}

resource "aws_ssm_parameter" "db_password" {
  name      = "/${var.project_name}/db_password"
  type      = "SecureString"
  value     = var.db_password
  overwrite = true

  tags = {
    Name = "${var.project_name}-db-password"
  }
}

resource "aws_ssm_parameter" "firebase_credentials" {
  name      = "/${var.project_name}/firebase_credentials"
  type      = "SecureString"
  value     = var.firebase_credentials
  overwrite = true

  tags = {
    Name = "${var.project_name}-firebase-credentials"
  }
}