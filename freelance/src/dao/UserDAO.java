package dao;

import db.DBConnection;
import java.sql.Connection;
import java.sql.PreparedStatement;

public class UserDAO {

    public static void registerUser(String username,String email,String password,String role){

        try{

            Connection con = DBConnection.getConnection();

            String sql="INSERT INTO users(username,email,password,role) VALUES(?,?,?,?)";

            PreparedStatement ps=con.prepareStatement(sql);

            ps.setString(1,username);
            ps.setString(2,email);
            ps.setString(3,password);
            ps.setString(4,role);

            ps.executeUpdate();

            System.out.println("User Registered");

        }
        catch(Exception e){
            e.printStackTrace();
        }

    }

}
