module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-angular-gettext');

    grunt.initConfig({
        nggettext_extract: {
            pot: {
                files: {
                    'po/template.pot': ['templates/**/*.html', 'js/**/*.js']
                }
            },
        },
        nggettext_compile: {
            all: {
                files: {
                    'js/translations.js': ['po/*.po']
                }
            },
        },
    });

    grunt.registerTask('default', ['nggettext_extract']);

};
