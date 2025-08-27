output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

# Note: ECS task IP is dynamic, check ECS console or AWS CLI for current IP
output "deployment_note" {
  description = "How to access the deployed application"
  value       = "Check ECS console for task public IP, then access http://<TASK_IP>/"
}