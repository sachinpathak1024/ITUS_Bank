resource aws_key_pair my_key_pair {
      key_name   = var.aws_key_pair_name
      public_key = file("./itus-key.pub")
}

resource "aws_default_vpc" "default" {

}

resource "aws_security_group" "my_sg" {
  name        = "ai-bankapp-sg"
  description = "Allow TLS inbound traffic and all outbound traffic"
  vpc_id      = aws_default_vpc.default.id

  tags = {
    Name = "ai-bankapp-sg"
  }
}


resource "aws_vpc_security_group_ingress_rule" "allow_https" {
  security_group_id = aws_security_group.my_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "allow_http" {
  security_group_id = aws_security_group.my_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh" {
  security_group_id = aws_security_group.my_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  ip_protocol       = "tcp"
  to_port           = 22
}

resource "aws_vpc_security_group_ingress_rule" "allow_frontend" {
  security_group_id = aws_security_group.my_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 3000
  ip_protocol       = "tcp"
  to_port           = 3000
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.my_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv6" {
  security_group_id = aws_security_group.my_sg.id
  cidr_ipv6         = "::/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}


resource "aws_instance" "my_instance" {
  ami           = "ami-02167eae61967e403"
  instance_type = "m7i-flex.large"
  vpc_security_group_ids = [aws_security_group.my_sg.id]
  key_name  = var.aws_key_pair_name



  root_block_device {
    volume_size = var.volume_size
    volume_type = "gp3"
  }


  tags = {
    Name = "ITUS_Bank"
  }
}