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
  retention_in_days = 3  # Short retention for Phase 1

  tags = {
    Name = "${var.project_name}-log-group"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"  # Minimal CPU for Phase 1
  memory                   = "512"  # Minimal Memory for Phase 1
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    # Redis container
    {
      name      = "redis"
      image     = "redis:7-alpine"
      essential = false
      memory    = 64
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "redis"
        }
      }
    },
    
    # MySQL container
    {
      name      = "mysql"
      image     = "mysql:8.0.37"
      essential = false
      memory    = 128
      
      environment = [
        {
          name  = "MYSQL_ROOT_PASSWORD"
          value = "root"
        },
        {
          name  = "MYSQL_DATABASE"
          value = "laravel_db"
        },
        {
          name  = "MYSQL_USER"
          value = "laravel_user"
        },
        {
          name  = "MYSQL_PASSWORD"
          value = "laravel_pass"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "mysql"
        }
      }
    },

    # Laravel PHP-FPM container
    {
      name      = "app"
      image     = var.ecr_repository_url
      essential = false
      memory    = 256
      
      dependsOn = [
        {
          containerName = "mysql"
          condition     = "START"
        },
        {
          containerName = "redis"
          condition     = "START"
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
          value = "localhost"
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
          value = "laravel_user"
        },
        {
          name  = "DB_PASSWORD"
          value = "laravel_pass"
        },
        {
          name  = "REDIS_HOST"
          value = "localhost"
        },
        {
          name  = "REDIS_PORT"
          value = "6379"
        },
        {
          name  = "CACHE_DRIVER"
          value = "redis"
        },
        {
          name  = "SESSION_DRIVER"
          value = "redis"
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
    },

    # Nginx container
    {
      name      = "nginx"
      image     = "nginx:alpine"
      essential = true
      memory    = 64
      
      dependsOn = [
        {
          containerName = "app"
          condition     = "START"
        }
      ]

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nginx"
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
  desired_count   = 1  # Single instance for Phase 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_task.id]
    subnets         = [aws_subnet.public.id]
    assign_public_ip = true
  }

  tags = {
    Name = "${var.project_name}-service"
  }
}