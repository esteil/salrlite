# Makefile for building chrome salrlite
#
# Does not support Safari5 salrlite yet.

KEYFILE = $(PWD)/../salrlite.pem
CRX_OUTPUT = $(PWD)/../salrlite.crx

default: $(CRX_OUTPUT)

$(CRX_OUTPUT): background.html background.js manifest.json openallthreads.js salrlite.user.js
	crxmake --pack-extension="$(PWD)" \
		--pack-extension-key="$(KEYFILE)" \
		--extension-output="$(CRX_OUTPUT)" \
		--ignore-dir="^(.git|salrlite.safariextension)" \
		--ignore-file="(Makefile|.safariextensionz)"
