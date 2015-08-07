CC_VERSION = compiler-20150729.tar.gz

default: minify

.PHONY: minify-dependencies
minify-dependencies:
	-mkdir -p build/lib
	-mkdir -p build/fetch/cc
	(cd build/fetch/cc && \
		wget -c http://dl.google.com/closure-compiler/${CC_VERSION} && \
		tar -xf ${CC_VERSION} && \
		cp compiler.jar ../../lib)
.PHONY: minify
minify: minify-dependencies
	java -jar build/lib/compiler.jar \
		--language_in ES5 \
		--js_output_file=build/openrosa-xpath.js \
		src/*.js
