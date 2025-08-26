# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-cache-subnet-group"
  }
}

# ElastiCache Instance (Redis) - 高速デプロイ用
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project_name}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  port                 = 6379
  parameter_group_name = "default.redis7"
  num_cache_nodes      = 1
  
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  # 高速デプロイのため暗号化なし（テスト環境）
  at_rest_encryption_enabled = false
  transit_encryption_enabled = false
  
  # バックアップなし（高速化）
  snapshot_retention_limit = 0
  
  tags = {
    Name = "${var.project_name}-redis"
  }
}