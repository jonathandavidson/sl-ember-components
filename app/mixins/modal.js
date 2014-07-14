import Ember from 'ember';

export default Ember.Mixin.create({

    layoutName: 'sl-components/templates/modal',

    classNames: [ 'modal', 'fade' ],

    actions: {

        close: function() {

            if ( this.$() ) {
                this.$().modal( 'hide' );
            }
        }

    }

});