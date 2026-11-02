var _ = require('lodash');
var ps = require('current-processes');
 
ps.get(function(err, processes) {
 
    var sortedCpu = _.sortBy(processes, 'cpu');
    var top5Cpu  = sortedCpu.reverse().splice(0, 5);
    console.log("\n\n ***Top 5 Cpu: ", top5Cpu);


    var sortedMem = _.sortBy(processes, 'mem.usage');
    var top5Mem  = sortedMem.reverse().splice(0, 10);

    console.log("\n\n Top 5 Mem:",top5Mem);
});

