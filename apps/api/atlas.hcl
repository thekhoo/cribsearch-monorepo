// Atlas project configuration for cribsearch API.
//
// Each env uses DATABASE_URL from the environment so the per-universe
// connection string is injected at run time (CI, local dev, etc.).
// The ephemeral "dev" database is a disposable Docker container used by
// Atlas for diff, validate, and lint — it is NOT the target database.

env "local" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/16/dev"
  migration {
    dir = "file://migrations"
  }
}

env "development" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/16/dev"
  migration {
    dir = "file://migrations"
  }
}

env "staging" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/16/dev"
  migration {
    dir = "file://migrations"
  }
}

env "production" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/16/dev"
  migration {
    dir = "file://migrations"
  }
}
