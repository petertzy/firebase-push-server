curl -X POST https://firebase-push-server.onrender.com/send-notification \
-H "Content-Type: application/json" \
-d '{
    "token": "fpuo18-tR-eHh_x0n3qU1i:APA91bERzv0carDR0yBtvSXpAcUJn5-XPcpsy4QC8pw4o-gtWkut56Qwx-Vpmcd0oNrvOwdcK7kSWhqm94t3rhW9qraiSi5f8mc-xjYs7Bs21imnb_LnoUM",
    "title": "Hello!",
    "body": "This is a test notification",
    "image": "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg"
}'
