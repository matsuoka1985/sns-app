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

# ECSタスク実行ロールにSSMパラメータ取得用ポリシーをアタッチ（既に設定済みなので冪等性確保）
resource "aws_iam_role_policy_attachment" "ecs_execution_attach_ssm" {
  role       = data.aws_iam_role.ecs_execution_role.name
  policy_arn = data.aws_iam_policy.ecs_ssm_policy.arn
}