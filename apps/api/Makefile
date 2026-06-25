build-ApiFunction:
	pnpm exec esbuild src/handler.ts --bundle --platform=node --target=es2022 --format=cjs --minify --sourcemap --outfile=$(ARTIFACTS_DIR)/handler.js

build-WorkerFunction:
	pnpm exec esbuild src/worker.ts --bundle --platform=node --target=es2022 --format=cjs --minify --sourcemap --outfile=$(ARTIFACTS_DIR)/worker.js
