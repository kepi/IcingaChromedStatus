// some helper constants
const STATE_OK = 0;
const STATE_PEND = 1;
const STATE_UNKN = 2;
const STATE_WARN = 4;
const STATE_CRIT = 8;

function Hosts()
{
  this.hosts = [];

  this.addHost = function(host)
  {
    this.hosts[host.name] = host;
  }

  this.setBadge = function()
  {
    for (var h in this.hosts) {

    }
    /*
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
    */
  }

  this.getHost = function(name)
  {
    return this.hosts[name];
  }

  this.toJSON = function(options)
  {
    var hosts = [];
    for (var h in this.hosts) {
      pushit = true;

      if ( options.warned == true )
        pushit = this.hosts[h].getState() ? false : true;

      if ( pushit )
        hosts.push(this.hosts[h].toJSON(options));
    }

    return {hosts: hosts};
  }
}

function Host(name, link) 
{
  this.name = name;
  this.link = link;
  this.services = new Array;
  this.state = STATE_OK;
  this.service_states = {WRONG: 0, WORST: 0, 0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

  this.addService = function(service) 
  {
    this.services[service.name] = service;
  }

  this.getService = function(name)
  {
    return this.services[name];
  }

  this.getState = function(what)
  {
    // only host state, we can return
    if ( what == 'own' )
      return this.state;

    // TODO: cachovat

    // we have to check for state
    for (var s in this.services) {
      // count this state
      ++this.service_states[this.services[s].state];
      // count all wrong states
      if ( this.services[s].state > STATE_OK )
        ++this.service_states.WRONG;
      // set worst state
      if ( this.services[s].state > this.service_states.WORST )
        this.service_states.WORST = this.services[s].state;
    }

    // default - return false if anything is wrong
    if ( what == undefined ) {
      return ( this.state == STATE_OK && this.service_states.WRONG == 0 )  ? true : false;
    } else if ( what == 'worst' ) {
      return this.service_states.WORST;
    } else if ( what == 'states_array' ) {
      return this.service_states;
    }

  }

  this.toJSON = function(options)
  {
    var services = [];
    for (var s in this.services)
      services.push(this.services[s].toJSON(options));

    var states = this.getState('states_array');
    console.log(states);
    
    return {name: this.name, link: this.link, services: services, states: states};
  }
}

function Service(name, link, state) 
{

  if ( state == 'OK' )
    this.state = STATE_OK;
  else if ( state == 'CRITICAL' )
    this.state = STATE_CRIT;
  else if ( state == 'WARNING' )
    this.state = STATE_WARN;
  else if ( state == 'UNKNOWN' )
    this.state = STATE_UNKN;
  else if ( state == 'PENDING' )
    this.state = STATE_PEND;

  this.name = name;
  this.link = link;

  this.toJSON = function(options)
  {
    return {name: this.name, link: this.link, state: this.state.toString()};
  }
}
