# Railway Kafka Setup — Configuration Reference

## Service 1 — Kafka Broker

**+ New Service → Docker Image → `apache/kafka:3.9.2`**

Variables (single-node KRaft combined mode):

```
KAFKA_NODE_ID=1
KAFKA_PROCESS_ROLES=broker,controller
KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka.railway.internal:9092
KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0
KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
```

**IMPORTANT:** `KAFKA_ADVERTISED_LISTENERS` must use the Railway internal hostname
(`kafka.railway.internal`) — not `localhost` or left with just a port. If this is wrong,
Kafka returns its container's Docker hostname in metadata responses, which other services
cannot resolve (you'll see `ENOTFOUND <container-id>` in consumer/producer logs).

After it deploys: Settings → Networking → verify the internal hostname is `kafka.railway.internal`.
If Railway assigned a different name, update `KAFKA_ADVERTISED_LISTENERS` to match.

---

## Service 2 — Kafka Consumer

**+ New Service → GitHub Repo → `jakevb8/NexusCore`**
**Root Directory = `apps/kafka-consumer`**

Variables (replace the placeholder with the broker internal hostname from above):

```
KAFKA_BROKERS=<broker-internal-hostname>:9092
```

---

## Service 3 — Existing API service

Add one variable (same broker internal hostname):

```
KAFKA_BROKERS=<broker-internal-hostname>:9092
```
