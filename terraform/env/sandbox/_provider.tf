

terraform {
  required_version = "1.8.5"
  cloud {
    organization = "ualett"
    workspaces {
      name = "sandbox-backend-cli-driven"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.55.0"
    }
  }
}
