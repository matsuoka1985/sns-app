# ECS関連の既存リソースを参照
data "aws_iam_role" "ecs_execution_role" {
  name = "sns-app-ecs-execution-role"
}

data "aws_iam_role" "ecs_task_role" {
  name = "sns-app-ecs-task-role"
}

# GitHub Actions用IAMロール（既存を参照）
data "aws_iam_role" "github_actions_role" {
  name = "sns-app-github-actions-role"
}

# Current AWS account data
data "aws_caller_identity" "current" {}