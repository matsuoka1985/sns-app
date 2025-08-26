# 既存のECS Task Execution Roleを参照
data "aws_iam_role" "ecs_execution_role" {
  name = "sns-app-ecs-execution-role"  # 手動で作成済みのロール名
}

# 既存のECS Task Roleを参照
data "aws_iam_role" "ecs_task_role" {
  name = "sns-app-ecs-task-role"  # 手動で作成済みのロール名
}

# 既存のSSMパラメータアクセス用ポリシーを参照
data "aws_iam_policy" "ecs_ssm_policy" {
  name = "sns-app-ecs-ssm-policy"  # 手動で作成済みのポリシー名
}

# 既存のGitHub Actions用IAMロールを参照
data "aws_iam_role" "github_actions_role" {
  name = "sns-app-github-actions-role"  # 手動で作成済みのロール名
}

# Current AWS account data
data "aws_caller_identity" "current" {}

# ECSタスク実行ロール用のSSMアクセスポリシー（インライン作成）
resource "aws_iam_role_policy" "ecs_execution_ssm_access" {
  name = "social-app-ecs-execution-ssm-access"
  role = data.aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/*"
        ]
      }
    ]
  })
}