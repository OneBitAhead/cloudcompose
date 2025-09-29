//import { createRequire } from 'node:module';
//const require = createRequire(import.meta.url);

const createClient = async function( keycloak, constants ){

    console.log('createClient', constants )

    // // Add client
    // var client = {};

    // client = await keycloak.getClientByName( constants.name );
    // if(!client && !client.id) {


    //     try{    
    //         client = await keycloak.upsertClient( constants.name, {
    //         baseUrl: constants.url,
    //         rootUrl: constants.url,
    //         redirectURIs: [
    //             `${constants.url}/login/${constants.uuid}/callback`
    //         ],
    //         roles:[{name: "admin", description: ''},{"name":"user","description": ""}]
    //     });
    //     }catch(e){
    //         console.log(e);
    //         client = await keycloak.getClientByName( constants.name );
    //     }

    //     // Be sure roles are there!!!
    //     // try{
    //     //     await keycloak.addRole(client.id,{name: "admin"});
    //     //     await kkeycloak.addRole(client.id,{name: "user"});
    //     // } catch(e){
    //     //     console.log(e);
    //     //     return e;
    //     // } 

    // }

    // Return client id and client secret
    const secret = await keycloak.getClientSecret( constants.name )
    return secret;

}

const fn = {
  createClient
};

export default fn;