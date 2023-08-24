# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/focal64"
  config.vm.network :forwarded_port, host: 8085, guest: 8085
  config.vm.provider :virtualbox do |vb|
      vb.customize ["modifyvm", :id, "--memory", "2024", "--cpus", 4]
  end

  config.vm.provision :shell, :path => "setup/bootstrap.sh"

end
