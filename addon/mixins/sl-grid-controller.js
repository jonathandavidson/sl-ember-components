import Ember from 'ember';
import SlApplicationState from './sl-application-state-controller';

export default Ember.Mixin.create( SlApplicationState, {
   
    needs: [ 'user' ],

    initializer: function(){
        this.loadApplicationState();
    }.on( 'init' ),

    actions: {
        sortColumn: function( column ){
            if( column.get( 'isSorted' ) ){
                column.toggleProperty( 'sortAscending' );
            } else {
                this.get( 'columns' ).setEach( 'isSorted', false );
                column.set('isSorted', true );
                column.set( 'sortAscending', column.getWithDefault( 'sortAscending', true ) );
            }
            this.saveApplicationState();
            this.reloadModel(); 
        },

        reload: function(){
            this.reloadModel();
        },

        toggleColumnVisibility: function( columnName ){
            var foundColumn =  this.get( 'columns' ).findBy( 'key', columnName );

            if( foundColumn ){
                foundColumn.toggleProperty( 'hidden' );
            }
            this.saveApplicationState();
        },

        resetColumns: function(){ 
            this.resetColumns(); 
        },
        
        reorderColumn: function( oldIndex, newIndex ){
            this.reorderColumn( oldIndex, newIndex );            
        }

    },

    grid: Ember.Object.create(),

    gridDefinition: function(){
        Ember.assert('sl-grid-controller: you must define the `grid` property on your controller.',false);
    }.property(), 

    columns: Ember.computed.alias( 'grid.columns' ),

    options: Ember.computed.alias( 'grid.options' ),

    applicationStateVariable: Ember.computed.alias( 'grid' ),

    applicationStateDefinition: Ember.computed.alias( 'gridDefinition' ),
   
    applicationStateNamespace: function(){
        return this.store.pluralize( this.get( 'modelName' ) ); 
    }.property( 'modelName' ),

    applicationStateDidLoad: function(){
        this.notifyPropertyChange( 'sortProperties' );
        //after we get real data model cacheing laid into sl-model we can make this work right
        //for now this gets fired twice, once here and once when itemCountPerPage loads from saved
        //user preferences in localStorage :-/
        //Ember.run.once( this, 'reloadModel');
    }.on( 'applicationStateDidLoad' ),
    
    isLoading: Ember.computed.alias( 'model.isPending' ),
    
    columnCount: function(){
        return this.get( 'columns.length' ) +
            ( this.get( 'columns.length' ) - this.get( 'columns' ).filterBy( 'noColumnResize' ).length )+
            ( this.get( 'options.rowExpander' ) ? 1 : 0 )+
            ( this.get( 'options.actionsColumn' ) ? 1 : 0 );
    }.property( 'columns.length'),

    totalWidthHints: function(){
        var columns = this.get( 'columns' ),
            totalWidthHints = 0;

        columns.forEach( function( col ){
            totalWidthHints += col.getWithDefault( 'widthHint', 1 );
        });

        return totalWidthHints;
    }.property( 'columns.@each.widthHint' ),

    reorderColumn: function( oldIndex, newIndex ){
        var columns = this.get( 'columns' ),
        elementToMove;
       
        columns.arrayContentWillChange( oldIndex, 1);
        elementToMove = columns.splice( oldIndex, 1)[0];
        columns.arrayContentDidChange( oldIndex, 1);

        columns.arrayContentWillChange( newIndex, 0, 1 );
        columns.splice( newIndex, 0, elementToMove );
        columns.arrayContentDidChange( newIndex, 0, 1 );

        this.saveApplicationState();
    },
 
    resetColumns: function(){
        var gridColumnDefs = this.get( 'gridDefinition.columns' ),
            tmpColumns = Ember.A([]);
        
        gridColumnDefs.forEach( function( columnDef ){
           tmpColumns.pushObject( Ember.Object.create( columnDef ) );
        }, this );
        
        this.set( 'columns', tmpColumns );

        this.saveApplicationState();
    },

    columnWidthObserver: function(){
        Ember.run.debounce( this, this.saveApplicationState, 500 ); 
    }.observes( 'columns.@each.width' ),

    itemCountPerPage: Ember.computed.alias( 'options.itemCountPerPage' ),

    itemCountPerPageObserver: function(){
        this.saveApplicationState();
    }.observes( 'itemCountPerPage' ),

    filters: Ember.A(),

    filtersOberver: function(){

        Ember.run.once( this, this.reloadModel );

    }.observes( 'filters.@each' ),

    /**
     * reload the model for this controller with the current paging preferences
     *
     * override this function with your own model reloading logic if need be
     *
     */
    reloadModel: function(){

        var modelName = this.get( 'modelName' ),
            currentPage = this.get( 'currentPage' ),
            itemCountPerPage = this.get( 'itemCountPerPage' ),
            filters = this.get( 'filters' ),
            options = {
                data: {
                    format: 'json',
                    itemCountPerPage: itemCountPerPage,
                    page: currentPage,
                    start: ( currentPage - 1) * itemCountPerPage
                },
                reload: true
            },
            model,
            columns = this.get( 'columns' ),
            sortedColumn = columns ? columns.findBy( 'isSorted', true ) : null,
            sortAscending = sortedColumn ? sortedColumn.get( 'sortAscending' ) : null;

        if( sortedColumn ){
            options.data.sort = JSON.stringify([ { property: sortedColumn.get( 'key' ), 
                direction: sortAscending ? 'ASC' : 'DESC'
            }]);
        }

        filters.forEach( function( filter ){
            options.data[ filter.key] = filter.value;
        });

        //this assumes you are using an sl-model like store that can take 
        //an options hash as a second parameter
        model = this.store.find( modelName, options );

        this.set( 'model', model );

        model.then( function(){
            this.set( 'metaData', this.store.metadataFor( modelName ) );
        }.bind( this ) );
    }
});