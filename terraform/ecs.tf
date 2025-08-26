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

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"  # 0.25 vCPU
  memory                   = "512"  # 512 MB

  execution_role_arn = data.aws_iam_role.ecs_execution_role.arn
  task_role_arn      = data.aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "nginx"
      image = "${var.ecr_repository_url}:nginx-latest"

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "app-volume"
          containerPath = "/var/www"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.nginx.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nginx"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost/up || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      dependsOn = [
        {
          containerName = "laravel-app"
          condition     = "START"
        }
      ]
    },
    {
      name  = "laravel-app"
      image = var.ecr_repository_url

      portMappings = [
        {
          containerPort = 9000
          protocol      = "tcp"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "app-volume"
          containerPath = "/var/www"
          readOnly      = false
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
          name  = "APP_URL"
          value = "https://api.${var.domain_name}"
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
          value = "laravel_db"
        },
        {
          name  = "DB_USERNAME"
          value = "admin"
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
          name  = "CACHE_STORE"
          value = "redis"
        },
        {
          name  = "SESSION_DRIVER"
          value = "redis"
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
          "awslogs-stream-prefix" = "laravel"
        }
      }
    }
  ])

  volume {
    name = "app-volume"
  }

  tags = {
    Name = "${var.project_name}-task-definition"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "nginx"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.app]

  tags = {
    Name = "${var.project_name}-service"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-logs"
  }
}

resource "aws_cloudwatch_log_group" "nginx" {
  name              = "/ecs/${var.project_name}-nginx"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-nginx-logs"
  }
}