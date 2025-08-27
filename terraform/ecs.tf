# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-log-group"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.ecr_repository_url
      essential = true
      
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "APP_ENV"
          value = "production"
        },
        {
          name  = "APP_DEBUG"
          value = "false"
        },
        {
          name  = "DB_CONNECTION"
          value = "mysql"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.main.endpoint
        },
        {
          name  = "DB_PORT"
          value = "3306"
        },
        {
          name  = "DB_DATABASE"
          value = aws_db_instance.main.db_name
        },
        {
          name  = "REDIS_HOST"
          value = aws_elasticache_cluster.main.cache_nodes[0].address
        },
        {
          name  = "REDIS_PORT"
          value = "6379"
        },
        {
          name  = "CORS_ALLOWED_ORIGINS"
          value = var.cors_allowed_origins
        },
        {
          name  = "FRONTEND_URL"
          value = var.frontend_url
        }
      ]

      secrets = [
        {
          name      = "APP_KEY"
          valueFrom = aws_ssm_parameter.app_key.arn
        },
        {
          name      = "DB_USERNAME"
          valueFrom = aws_ssm_parameter.db_username.arn
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_ssm_parameter.db_password.arn
        },
        {
          name      = "FIREBASE_CREDENTIALS"
          valueFrom = aws_ssm_parameter.firebase_credentials.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task"
  }
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "${var.project_name}-service"
  }
}