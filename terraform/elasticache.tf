# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-cache-subnet-group"
  }
}

# ElastiCache Replication Group (Redis)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "${var.project_name}-redis"
  description                  = "Redis cluster for ${var.project_name}"
  
  node_type                    = "cache.t3.micro"  # コスト最適化
  port                         = 6379
  parameter_group_name         = "default.redis7"
  
  num_cache_clusters           = 1  # シングルノード（コスト削減）
  
  subnet_group_name            = aws_elasticache_subnet_group.main.name
  security_group_ids           = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = false  # Laravel Redisクライアントの互換性のため
  
  # バックアップ設定
  snapshot_retention_limit     = 1
  snapshot_window              = "03:00-05:00"
  
  # メンテナンス設定  
  maintenance_window           = "Mon:05:00-Mon:06:00"
  
  # 自動フェイルオーバー無効（シングルノードのため）
  automatic_failover_enabled   = false
  
  tags = {
    Name = "${var.project_name}-redis"
  }
}