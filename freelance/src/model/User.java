package model;

public class User {

    private int id;
    private String username;
    private String email;
    private String password;
    private String role;

    public User(){}

    public User(String username,String email,String password,String role){
        this.username=username;
        this.email=email;
        this.password=password;
        this.role=role;
    }

    public String getName(){
        return username;
    }

    public String getEmail(){
        return email;
    }

    public String getPassword(){
        return password;
    }

    public String getRole(){
        return role;
    }

}