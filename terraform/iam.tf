# ECS Task Execution Role（既存を参照）
data "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"
}

# ECS Task Execution Role（データソースがない場合のフォールバック）
resource "aws_iam_role" "ecs_execution_role_fallback" {
  count = 0  # 通常は作成しない
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-execution-role"
  }
}

# ポリシーアタッチメントは既存ロールに対して実行済みと仮定してスキップ
# resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
#   role       = data.aws_iam_role.ecs_execution_role.name
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
# }

# ECS Task Role（既存を参照）
data "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"
}

# ECS Task Role（フォールバック）
resource "aws_iam_role" "ecs_task_role_fallback" {
  count = 0  # 通常は作成しない
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-role"
  }
}

# SSMパラメータアクセス用ポリシー（既存を参照）
data "aws_iam_policy" "ecs_ssm_policy" {
  name = "${var.project_name}-ecs-ssm-policy"
}

# SSMパラメータアクセス用ポリシー（フォールバック）
resource "aws_iam_policy" "ecs_ssm_policy_fallback" {
  count = 0  # 通常は作成しない
  name        = "${var.project_name}-ecs-ssm-policy"
  description = "Policy for ECS to access SSM parameters"

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
          "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
        ]
      }
    ]
  })
}

# ポリシーアタッチメントは既存で実行済みと仮定してスキップ
# resource "aws_iam_role_policy_attachment" "ecs_task_ssm_policy" {
#   role       = data.aws_iam_role.ecs_task_role.name
#   policy_arn = data.aws_iam_policy.ecs_ssm_policy.arn
# }

# GitHub Actions用IAMロール（既存を参照）
data "aws_iam_role" "github_actions_role" {
  name = "sns-app-github-actions-role"
}


# Current AWS account data
data "aws_caller_identity" "current" {}

# ECSタスク実行ロールにSSMパラメータ取得用ポリシーをアタッチ
resource "aws_iam_role_policy_attachment" "ecs_execution_attach_ssm" {
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = data.aws_iam_policy.ecs_ssm_policy.arn
}