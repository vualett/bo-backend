

variable "ec2_bck_custom" {
  default = {
    "AMI"        = "ami-0f97f662249216df5"
    "EC2Type"    = "t3.medium"
    "SubnetID"   = "subnet-07b1d2296459ee72e"
    "SSHKeyName" = "sandbox_key"
    "OSDisk"     = 80 # expressed in GiB
  }
  description = "AMI ID for EC2 Instance"
  type        = map(string)
}

variable "tags_resources" {
  default = {
    "VPC"       = "SandBox VPC"
    "Env"       = "SandBox"
    "Org"       = "Ualett"
    "ManagedBy" = "Terraform"
  }
  description = "Default Resources Tagging List"
  type        = map(string)
}

# defining a variable to retrieve env value from github sha
# to read this variable is needed to set an environment variable as TF_VAR_git_commit_sha="commit-number"
variable "git_commit_sha" {
  type        = string
  default     = ""
  description = "Value of the Git Commit SHA"
}

resource "aws_instance" "backend_ec2" {
  ami                    = var.ec2_bck_custom["AMI"]
  instance_type          = var.ec2_bck_custom["EC2Type"]
  subnet_id              = var.ec2_bck_custom["SubnetID"]
  vpc_security_group_ids = ["sg-0e9037cbf45c45c69"]
  key_name               = var.ec2_bck_custom["SSHKeyName"]
  monitoring             = true
  ebs_optimized          = true

  root_block_device {
    volume_size           = var.ec2_bck_custom["OSDisk"]
    volume_type           = "gp2"
    encrypted             = true
    delete_on_termination = true
    tags = {
      Name        = "EC2 Backend RootDsk ${var.tags_resources["Env"]}"
      Org         = "${var.tags_resources["Org"]}"
      ManagedBy   = "${var.tags_resources["ManagedBy"]}"
      Environment = "${var.tags_resources["Env"]}"
      AppRole     = "Backend"
      AppName     = "BackOffice"
    }
  }

  tags = {
    Name        = "EC2 Backend - ${var.tags_resources["Env"]} - Commit: ${var.git_commit_sha}"
    Org         = "${var.tags_resources["Org"]}"
    ManagedBy   = "${var.tags_resources["ManagedBy"]}"
    Environment = "${var.tags_resources["Env"]}"
    AppRole     = "Backend"
    AppName     = "BackOffice"
  }
  lifecycle {
    create_before_destroy = true
  }

  associate_public_ip_address = false
}
