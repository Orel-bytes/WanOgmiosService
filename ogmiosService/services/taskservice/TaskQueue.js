const Heap =require("./BinaryHeap");
class TaskQueue{
    constructor(props) {

        this.taskAllTaskMap = new Map();

        this.taskBgWaitHeap = new Heap(function(task){
            return task.requestTime;
        });
        this.taskBgRunningTaskMap = new Map();

        this.taskFgWaitHeap = new Heap(function(task){
            return task.requestTime;
        });
        this.taskFgRunningTaskMap = new Map();

        this.taskTgWaitHeap = new Heap(function(task){  //small top heap
            return task.nextStartTime;
        });
        this.taskTgRunningTaskMap = new Map();

    }
    addTask(_concreteTask){
        if(!_concreteTask){
            return false;
        }
        let proprity = _concreteTask.getPriority();
        let id = _concreteTask.getId();

        if(this.taskAllTaskMap.has(id)){
        //    console.log('get3000 ----  this.taskAllTaskMap.has id');
            let oldTask = this.taskAllTaskMap.get(id);
            oldTask.setRequestTime();
            return false;
        }else {
            this.taskAllTaskMap.set(id, _concreteTask);
            _concreteTask.setRequestTime();
            switch (proprity) {
                case 'bg':
          //          console.log('get3000 ------ taskBgWaitHeap.push _concreateTask');
                    this.taskBgWaitHeap.push(_concreteTask);
                    break;
                case 'fg':
          //              console.log('get3000 ------ taskFgWaitHeap.push _concreateTask');
                        this.taskFgWaitHeap.push(_concreteTask);
                    break;
                case 'tg':
                    this.taskTgWaitHeap.push(_concreteTask);
                    break;
            }
        }
    }

    setTaskFinish(_concreteTask){
        

        let id = _concreteTask.getId();

        let priority = _concreteTask.getPriority();
        let requestTime = _concreteTask.getRequestTime();
        let exectueTime = _concreteTask.getExecuteTime();
    //    console.log('get3000 -- TaskQueue.setTaskFinish , the _concreateTask.id: ' + id + ' proproty: ' + priority);
        if(requestTime> exectueTime){ //normal situation, the executeTime > requestTime
     //       console.log('get3000 -- has Repeated task');
           let result =  _concreteTask.isRepeated();
           if(result){ //if is repeated time, will discard
               this.taskAllTaskMap.delete(id); //normal
               switch(priority){
                   case 'bg':
                       this.taskBgRunningTaskMap.delete(id);
                       break;
                   case 'fg':
                       this.taskFgRunningTaskMap.delete(id);
                       break;
                   case 'tg':
                       this.taskTgRunningTaskMap.delete(id);
                       break;
               }
           }else{ // need continue to run
               _concreteTask.setRequestTime();
               switch (priority) {
                   case 'bg':
                       this.taskBgRunningTaskMap.delete(id);
                       this.taskBgWaitHeap.push(_concreteTask); // -- push wait heap again
                       break;
                   case 'fg':
                       this.taskFgRunningTaskMap.delete(id);
                       this.taskFgWaitHeap.push(_concreteTask);
                       break;
                   case 'tg':
                       this.taskTgRunningTaskMap.delete(id);
                       this.taskTgWaitHeap.push(_concreteTask);
                       break;
               }
           }

        }else{
          //  console.log('get3000  --- normal delete task, id: ',id);
            this.taskAllTaskMap.delete(id); //normal
            switch(priority){
                case 'bg':
                   //     console.log('get300 --- normal delete bg task');
                    this.taskBgRunningTaskMap.delete(id);
                    break;
                case 'fg':
                  //  console.log('get300 --- normal delete fg task');
                    this.taskFgRunningTaskMap.delete(id);
                    break;
                case 'tg':
                    //    console.log('get300 --- normal delete tg task');
                        this.taskTgRunningTaskMap.delete(id);
                    break;
            }
        }
    }

    ///////////////////////////////////////////////////
    selectFgTask(){
        if(this.taskFgWaitHeap.length() === 0){
            return null;
        }else{
            let tasks = [];
            while(this.taskFgWaitHeap.length() > 0){
                //console.log('get3000 --- taskFgWaitHeap.Length ', this.taskFgWaitHeap.length());
                let task = this.taskFgWaitHeap.pop();
                task.setExecuteTime();
                tasks.push(task);
            }
            return tasks;

        }
    }

    selectBgTask(){
        if(this.taskBgRunningTaskMap.size !== 0){
            return null;
        }else{
            if(this.taskBgWaitHeap.length() === 0){
                return null;
            } else{
                let task =  this.taskBgWaitHeap.pop();
                if(task){
                    task.setExecuteTime();

                    let id = task.getId();
                    this.taskBgRunningTaskMap.set(id,task);
                    return task;
                }else{
                    return null;
                }

            }
        }
    }
    selectTgTask(){
     //   if(this.taskTgRunningTaskMap.size !== 0){
     //       return null;
     //   }else{
            if(this.taskTgWaitHeap.length() === 0){
                return null;
            }else {
                let tasks = [];
                let currentTime = new Date().getTime();
                let task = this.taskTgWaitHeap.peek();
                if(task){
                    while(task.nextStartTime< currentTime){
                        //console.log('get3000 ---  selectTgTask nextStarTime :' + task.nextStartTime + ' -- currentTime: ' + currentTime);
                        task.setExecuteTime();
                        tasks.push(task);
                        let id = task.getId();
                        this.taskTgRunningTaskMap.set(id,task);
                        this.taskTgWaitHeap.delete(task);
                        task = this.taskTgWaitHeap.peek();
                        if(!task){
                            break;
                        }
                    }
                }

                return tasks;
            }
       // }

    }



}
module.exports = TaskQueue;