variable aws_key_pair_name{
    type = string
    default = "itus-key"
    description = "this is the key for the ITUS bank app"
}
variable volume_size {
    type = number
    default = 20
    description = "this is the volume size of instance"
}