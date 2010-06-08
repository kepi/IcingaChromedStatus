function Host(name, link) {
  this.name = name;
  this.link = link;
  this.services = new Array;

  this.warned = 0;
  this.critical = 0;
  this.unknown = 0;

  this.addService = function(service) 
  {
    this.services[service.name] = service;
    if ( service.state == 'WARNING' )
      this.warned = this.warned + 1;
  }

  this.getService = function(name)
  {
    return this.services[name];
  }
}

function Service(name, link, state) 
{
  this.name = name;
  this.link = link;
  this.state = state;
}
