# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS Instance (コスト最適化のためt3.micro)
resource "aws_db_instance" "main" {
  identifier             = "${var.project_name}-db"
  allocated_storage      = 10
  max_allocated_storage  = 20
  storage_type           = "gp2"
  storage_encrypted      = true
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"  # 無料枠対象
  
  db_name  = "laravel_db"
  username = "admin"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  skip_final_snapshot = true
  deletion_protection = false
  
  # パフォーマンス最適化
  performance_insights_enabled = false  # コスト削減のため無効
  monitoring_interval         = 0       # 拡張モニタリング無効
  
  tags = {
    Name = "${var.project_name}-database"
  }
}