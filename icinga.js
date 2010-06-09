function Hosts()
{
  this.hosts = [];

  this.ok = 0;
  this.warned = 0;
  this.critical = 0;
  this.unknown = 0;
  this.pending = 0;
  this.acked = 0;

  this.addHost = function(host)
  {
    this.updateHostState(host);
    this.hosts[host.name] = host;
  }

  this.updateHostState = function(host)
  {
    if ( host.state == 'WARNING' )
      ++this.warned;
    else if ( host.state == 'CRITICAL' )
      ++this.critical;
    else if ( host.state == 'UNKNOWN' )
      ++this.unknown;
    else if ( host.state == 'PENDING' )
      ++this.pending;
    else if ( host.state == 'OK' )
      ++this.ok;
  }

  this.setBadge = function()
  {
    if ( this.critical > 0 ) {
      color = [255, 255, 0, 255];
      text = this.critical.toString();
    } else if ( this.warned > 0 ) {
      color = [255, 265, 0, 255];
      text = this.warned.toString();
    } else {
      color = [0, 204, 51, 255];
      text = this.ok.toString();
    }

    chrome.browserAction.setBadgeText({text: text});
    chrome.browserAction.setBadgeBackgroundColor({color: color});
  }


  this.getHost = function(name)
  {
    return this.hosts[name];
  }

  this.toJSON = function(options)
  {
    var hosts = [];
    for (s in this.hosts) {
      pushit = true;

      if ( options.warned == true )
        pushit = this.hosts[s].warned ? true : false;

      if ( pushit )
        hosts.push(this.hosts[s].toJSON(options));
    }

    return {hosts: hosts};
  }
}

function Host(name, link) 
{
  this.name = name;
  this.link = link;
  this.services = new Array;
  this.state = 'OK';

  this.ok = 0;
  this.warned = 0;
  this.critical = 0;
  this.unknown = 0;
  this.pending = 0;
  this.acked = 0;

  this.stateTotal = function()
  {
    if ( this.state != 'OK' )
      return this.state;
    else if ( this.critical > 0 )
      return 'CRITICAL';
    else if ( this.warned > 0 )
      return 'WARNED';
    else if ( this.unknown > 0 )
      return 'UNKNOWN';
    else if ( this.pending > 0 )
      return 'PENDING';
    else
      return 'OK';
  }

  this.addService = function(service) 
  {
    if ( service.state == 'WARNING' )
      ++this.warned;
    else if ( service.state == 'CRITICAL' )
      ++this.critical;
    else if ( service.state == 'UNKNOWN' )
      ++this.unknown;
    else if ( service.state == 'PENDING' )
      ++this.pending;
    else if ( service.state == 'OK' )
      ++this.ok;
    
    this.services[service.name] = service;
  }

  this.getService = function(name)
  {
    return this.services[name];
  }

  this.toJSON = function(options)
  {
    var services = [];
    for (s in this.services)
      services.push(this.services[s].toJSON(options));

    return {name: this.name, link: this.link, services: services};
  }
}

function Service(name, link, state) 
{
  this.name = name;
  this.link = link;
  this.state = state;

  this.toJSON = function(options)
  {
    return {name: this.name, link: this.link, state: this.state};
  }
}
