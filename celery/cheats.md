
## get all celery workers with memory and pid

`ps aux | grep "celery worker" | awk '{cmd=$0; if(match(cmd,/--queues=([^ ]+)/,m)) print $2 "\t" $6/1024 "MB\t" m[1] "\t" $11}'`


