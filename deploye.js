var fs = require('fs-extra');
var exec = require('child_process').exec;
var filessystem = require('fs');

var d=new Date().toISOString().slice(0, 10);
console.log('date ' , d);

var dir = '/home/administrator/'+d;

if (!filessystem.existsSync(dir)){
  filessystem.mkdirSync(dir);
  if(!filessystem.existsSync(dir/+"1")){
    filessystem.mkdirSync(dir/+"1");
  }
}else
{
  console.log("Directory already exist");
}


/*fs.copy('./dist', '/home/administrator/build/dist', err => {
  if (err) return console.error(err)

  console.log('success!')
})*/








//var child = exec('npm install').stderr.pipe(process.stderr);
//console.log(child);

