import time
import random
import mysql.connector
import paho.mqtt.client as mqtt

# Підключення до бази
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="pet_health"
)
cursor = db.cursor(dictionary=True)

# MQTT
client = mqtt.Client()
client.connect("localhost", 1883, 60)

while True:
    cursor.execute("SELECT id, name FROM pets")
    pets = cursor.fetchall()
    for pet in pets:
        temp = round(random.uniform(37.0, 39.0), 1)
        payload = f'{pet["id"]},{temp}'
        client.publish("pets/temperature", payload)
    time.sleep(5)
