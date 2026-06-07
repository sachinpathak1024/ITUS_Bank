# ITUS Bank — Backend

Spring Boot 3.4 REST API. Persists to PostgreSQL, signs JWTs for auth,
and proxies AI chat requests to the Ollama service.

## Stack

- **Java 21** (virtual threads enabled)
- **Spring Boot 3.4** — Web, Data JPA, Security
- **Hibernate** with the PostgreSQL dialect
- **PostgreSQL 16**
- **JWT** for stateless auth (256-bit HMAC)
- **bcrypt** password hashing
- **Lombok** for boilerplate reduction
- **Maven** build

## Local development

```bash
cd backend

# 1. Start Postgres + Ollama (without the backend or frontend)
docker compose -f ../docker-compose.yml up -d postgres ollama

# 2. Run the backend from your IDE or:
./mvnw spring-boot:run         # or: mvn spring-boot:run
```

The backend listens on **port 8080** locally. When run through Docker
Compose it's exposed on the host as **port 8082**.

### Running tests

```bash
./mvnw test
```

(There aren't any tests checked in yet — this is a starter project.)

## Configuration

All config lives in `src/main/resources/application.properties` and is
overridable via env vars (the `${VAR:default}` syntax):

| Property              | Env var           | Default                                |
|-----------------------|-------------------|----------------------------------------|
| Postgres host         | `DATABASE_HOST`   | `localhost`                            |
| Postgres port         | `DATABASE_PORT`   | `5432`                                 |
| Postgres database     | `DATABASE_NAME`   | `bankappdb`                            |
| Postgres user         | `DATABASE_USER`   | `bankuser`                             |
| Postgres password     | `DATABASE_PASSWORD` | `bankpass123`                        |
| JWT secret            | `JWT_SECRET`      | demo string (replace in prod)          |
| JWT expiry (ms)       | `JWT_EXPIRATION`  | `86400000` (24h)                       |
| Ollama URL            | `OLLAMA_URL`      | `http://localhost:11434`               |
| Ollama model          | _(hardcoded)_     | `tinyllama`                            |

## Project structure

```
backend/
├── pom.xml
├── Dockerfile
└── src/main/
    ├── java/com/bankapp/
    │   ├── BankappApplication.java
    │   ├── config/
    │   │   └── SecurityConfig.java       JWT + CORS + route matchers
    │   ├── security/
    │   │   ├── JwtTokenProvider.java     Sign / validate JWTs
    │   │   └── JwtTokenFilter.java       Reads Authorization header
    │   ├── model/
    │   │   ├── Account.java              Core user/account entity (UserDetails)
    │   │   ├── Transaction.java
    │   │   ├── Beneficiary.java
    │   │   ├── Bill.java
    │   │   ├── ScheduledTransfer.java
    │   │   └── Notification.java
    │   ├── repository/                   Spring Data JPA repos
    │   ├── service/
    │   │   ├── AccountService.java       Register / login / balance ops
    │   │   ├── TransactionService.java
    │   │   ├── BeneficiaryService.java
    │   │   ├── BillService.java          + BillerCatalog static seed
    │   │   ├── ScheduledTransferService.java
    │   │   ├── NotificationService.java
    │   │   ├── InsightsService.java      Monthly + category aggregates + CSV
    │   │   ├── ChatService.java          Ollama proxy
    │   │   └── AccountDetailService.java UserDetailsService impl
    │   ├── controller/                   REST endpoints
    │   └── dto/                          Request + response DTOs
    └── resources/
        └── application.properties
```

## API reference

All endpoints (except `/api/auth/login` and `/api/auth/register`) require
`Authorization: Bearer <jwt>`.

### Auth

| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| POST   | `/api/auth/register`          | Create a user, return JWT    |
| POST   | `/api/auth/login`             | Authenticate, return JWT     |
| POST   | `/api/auth/change-password`   | Change own password (auth)   |

### Bank — account & transfers

| Method | Path                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/api/bank/account`           | Current user's account entity            |
| GET    | `/api/bank/profile`           | Profile (no password / no recursion)     |
| PUT    | `/api/bank/profile`           | Update name, email, phone, address, occupation |
| POST   | `/api/bank/profile/avatar`    | Base64 avatar upload (max ~500 KB)       |
| GET    | `/api/bank/profile/stats`     | Lifetime credits / debits / counts       |
| POST   | `/api/bank/deposit`           | `{amount}`                               |
| POST   | `/api/bank/withdraw`          | `{amount}`                               |
| POST   | `/api/bank/transfer`          | `{recipientUsername, amount, description}` |
| GET    | `/api/bank/transactions`      | Paginated, filterable. Params: `type, search, start, end, page, size` |
| GET    | `/api/bank/insights?months=6` | Monthly + category aggregates            |
| GET    | `/api/bank/statement`         | CSV download. Params: `start, end`       |

### Beneficiaries

| Method | Path                              | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | `/api/bank/beneficiaries`         | List saved beneficiaries     |
| POST   | `/api/bank/beneficiaries`         | `{recipientUsername, nickname}` |
| DELETE | `/api/bank/beneficiaries/{id}`    | Remove                       |

### Bills

| Method | Path                              | Description                              |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/api/bank/bills/billers`         | Static catalog: `{category: [biller, …]}` |
| GET    | `/api/bank/bills`                 | Last 20 paid bills                       |
| POST   | `/api/bank/bills/pay`             | `{category, billerName, billNumber, amount}` |

### Scheduled transfers

| Method | Path                                       | Description              |
|--------|--------------------------------------------|--------------------------|
| GET    | `/api/bank/scheduled-transfers`            | List                     |
| POST   | `/api/bank/scheduled-transfers`            | Create                   |
| DELETE | `/api/bank/scheduled-transfers/{id}`       | Cancel                   |
| POST   | `/api/bank/scheduled-transfers/{id}/run-now` | Execute now            |

> Auto-execution via a cron job is not implemented — these execute only
> when `run-now` is called explicitly. This is a known follow-up.

### Notifications

| Method | Path                                   | Description                  |
|--------|----------------------------------------|------------------------------|
| GET    | `/api/bank/notifications`              | `{items, unread}`            |
| POST   | `/api/bank/notifications/read-all`     | Mark all read                |

### AI chat

| Method | Path                | Description                                |
|--------|---------------------|--------------------------------------------|
| POST   | `/api/chat/ask`     | `{message}` → calls Ollama, returns answer |

### Health

| Method | Path                       | Description                  |
|--------|----------------------------|------------------------------|
| GET    | `/actuator/health`         | Public — used by Compose probe |

## Security

- All `/api/**` routes (except the two auth endpoints) require a valid JWT.
- The JWT filter populates `@AuthenticationPrincipal Account`.
- Passwords are bcrypt-hashed at registration / change.
- `Account.password` is JSON-ignored, so it never leaks in any response.
- CORS is configured in `SecurityConfig.corsConfigurationSource()` to allow
  `http://localhost:3000` and `http://localhost:8080`.

## Building the Docker image

```bash
cd backend
docker build -t itus-backend .
```

The image is a two-stage build:

1. `eclipse-temurin:21-jdk-alpine` runs `mvn package`
2. `eclipse-temurin:21-jre-alpine` copies in just the fat JAR

## Database notes

- `spring.jpa.hibernate.ddl-auto=update` — Hibernate adds new columns
  automatically. **Do not** rely on this for destructive changes; use
  proper migrations (Flyway / Liquibase) in production.
- New `Account` columns get sensible defaults. The `kyc_status` column
  defaults to `VERIFIED` for new users; legacy rows can be backfilled with
  `UPDATE accounts SET kyc_status='VERIFIED' WHERE kyc_status IS NULL;`.
