# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS Instance (簡単削除設定)
resource "aws_db_instance" "main" {
  identifier             = "${var.project_name}-db"
  allocated_storage      = 10
  storage_type           = "gp2"
  storage_encrypted      = false  # 暗号化なし（削除を簡単に）
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  db_name                = "laravel_db"
  username               = "admin"
  password               = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  # バックアップ無効（即座に削除可能）
  backup_retention_period = 0
  
  # スナップショット作成しない（即座に削除）
  skip_final_snapshot      = true
  delete_automated_backups = true
  
  # 削除保護無効（簡単削除）
  deletion_protection = false

  tags = {
    Name = "${var.project_name}-db"
  }
}